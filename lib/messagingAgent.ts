import { callGroq } from "./api";
import { WritingTone, getToneConfig, getDefaultTone } from "./tones";

export type MessagingAgentInput = {
  verified: {
    summary: string;
    points: Array<{ claim: string; source: { title: string; url: string } }>;
    contact?: { 
      primary_contact: { name: string; title: string; email?: string; source?: { title: string; url: string }; contact_type?: string };
      secondary_contact: { name: string; title: string; email?: string; source?: { title: string; url: string }; contact_type?: string };
    } | { name: string; title: string; email?: string; source?: { title: string; url: string } }; // legacy format
  };
  company: string;
  role: string;
  highlights: string; // user-provided
  tone?: WritingTone; // optional tone, defaults to formal
  resumeContent?: string; // optional resume content for personalization
};

export type MessagingAgentOutput = {
  linkedin: string; // exactly 44 words by default
  email: string; // 90-100 words, includes Subject: on first line
};

// GUARDRAIL HELPER FUNCTIONS
function cleanJsonArtifacts(content: string): string {
  if (!content) return "";
  
  // Remove common JSON artifacts and unwanted characters
  let cleaned = content
    .replace(/^["']|["']$/g, '') // Remove surrounding quotes
    .replace(/\\n/g, '\n') // Convert escaped newlines to actual newlines
    .replace(/\\t/g, '\t') // Convert escaped tabs
    .replace(/\\r/g, '\r') // Convert escaped carriage returns
    .replace(/\\"/g, '"') // Convert escaped quotes
    .replace(/^\s*\{.*\}\s*$/, '') // Remove if entire content is JSON object
    .replace(/^[^a-zA-Z]*/, '') // Remove leading non-alphabetic characters
    .trim();
  
  // For email content, preserve line breaks and paragraph structure
  // Only normalize excessive horizontal whitespace, NOT line breaks
  if (cleaned.toLowerCase().includes('subject:')) {
    // This is likely an email, preserve ALL line structure
    cleaned = cleaned.replace(/[ \t]{2,}/g, ' '); // Only normalize multiple spaces/tabs, keep single spaces and all newlines
  } else {
    // For non-email content (like LinkedIn), normalize all whitespace
    cleaned = cleaned.replace(/\s+/g, ' ');
  }
  
  return cleaned;
}

function validateLinkedInMessage(content: string): string {
  if (!content) return "";
  
  // Remove any JSON-like structures
  content = content.replace(/\{[^}]*\}/g, '').trim();
  
  // Only ensure reasonable length (20-80 words for flexibility)
  // Don't modify greetings as the AI should handle proper contact names
  const words = content.split(/\s+/).filter(word => word.length > 0);
  if (words.length > 80) {
    content = words.slice(0, 80).join(' ') + '...';
  }
  
  // Only add a greeting if the content is completely empty or doesn't start with any greeting-like word
  if (!content.match(/^(Hi|Hey|Hello|Dear|Good)\s+/i)) {
    // Only add a generic greeting if there's substantial content but no greeting
    if (content.length > 10) {
      content = `Hi! ${content}`;
    }
  }
  
  return content.trim();
}

function validateEmailMessage(content: string): string {
  if (!content) return "";
  
  // Remove any JSON-like structures first
  content = content.replace(/\{[^}]*\}/g, '').trim();
  
  // Check if it already has a proper email structure
  const hasSubject = content.toLowerCase().includes('subject:');
  
  // If it already has subject and reasonable content, preserve the structure
  if (hasSubject) {
    // Preserve the original line structure but clean up excess whitespace
    let result = content;
    
    // Only normalize multiple consecutive spaces, preserve line breaks
    result = result.replace(/[ \t]{2,}/g, ' ');
    
    // Ensure proper spacing after subject line (subject line should be followed by double newline)
    result = result.replace(/^(Subject:.*?)(\n)([^\n\s])/i, '$1\n\n$3');
    
    // Normalize excessive line breaks but preserve paragraph structure
    result = result.replace(/\n{4,}/g, '\n\n\n'); // Allow max triple line breaks for spacing
    
    // Check if the email body (after subject) is substantial enough
    const emailBody = result.replace(/^Subject:.*?\n+/i, '').trim();
    if (emailBody.length >= 20) {
      return result.trim();
    }
  }
  
  // Only add subject line if it's missing
  if (!hasSubject) {
    content = `Subject: Exploring Opportunities\n\n${content}`;
  }
  
  // Only add basic content if the email seems incomplete (very short)
  const contentWithoutSubject = content.replace(/^Subject:.*?\n+/i, '').trim();
  if (contentWithoutSubject.length < 20) {
    const subjectMatch = content.match(/^(Subject:.*?)(\n+)(.*)/is);
    if (subjectMatch) {
      content = `${subjectMatch[1]}\n\nHi,\n\nI hope this message finds you well. I wanted to reach out regarding potential opportunities.\n\nBest regards`;
    } else {
      content = `Subject: Exploring Opportunities\n\nHi,\n\nI hope this message finds you well. I wanted to reach out regarding potential opportunities.\n\nBest regards`;
    }
  }
  
  // Final cleanup while preserving paragraph structure - only trim each line, don't alter line breaks
  const lines = content.split('\n');
  const cleanedLines = lines.map(line => line.trim());
  const result = cleanedLines.join('\n');
  
  // Ensure proper spacing after subject line
  return result
    .replace(/^(Subject:.*?)(\n)([^\n\s])/i, '$1\n\n$3')
    .replace(/\n{4,}/g, '\n\n\n') // Max triple line breaks
    .trim();
}

function generateFallbackLinkedIn(input: MessagingAgentInput): string {
  const contactAny = input.verified.contact as any;
  const contactName = contactAny?.primary_contact?.name || contactAny?.secondary_contact?.name || contactAny?.name || "there";
  
  return `Hi ${contactName}! I'm interested in the ${input.role} position at ${input.company}. With my background in ${input.highlights.split(',')[0] || 'relevant experience'}, I'd love to connect and learn more about your team's goals. Would you be open to a brief conversation?`;
}

function generateFallbackEmail(input: MessagingAgentInput): string {
  const contactAny = input.verified.contact as any;
  const contactName = contactAny?.primary_contact?.name || contactAny?.secondary_contact?.name || contactAny?.name || "Hiring Manager";
  
  return `Subject: Interest in ${input.role} Position at ${input.company}

Dear ${contactName},

I hope this email finds you well. I'm writing to express my interest in the ${input.role} position at ${input.company}.

With my background in ${input.highlights.split('.')[0] || 'relevant experience'}, I believe I could contribute meaningfully to your team. I'm particularly drawn to ${input.company}'s innovative approach and would love to discuss how my skills align with your current needs.

Would you be available for a brief conversation to explore this opportunity further?

Best regards`;
}

export async function messagingAgent(input: MessagingAgentInput): Promise<MessagingAgentOutput> {
  const tone = input.tone || getDefaultTone();
  const toneConfig = getToneConfig(tone);
  
  // Contact information processing
  const system = `You are a master of warm, high-conversion outreach. Return ONLY valid JSON with exactly two properties: {"linkedin":"string","email":"string"}.

TONE INSTRUCTION: ${toneConfig.systemPrompt}

STYLE EXAMPLES for ${toneConfig.label.toUpperCase()} tone:

LinkedIn Example: ${toneConfig.exampleLinkedIn}

Email Example: ${toneConfig.exampleEmail}

You are a professional outreach specialist creating personalized messages.

**CRITICAL OUTPUT REQUIREMENTS:**
- Return ONLY a JSON object with "linkedin" and "email" properties
- Do NOT include any explanations, additional text, or formatting outside the JSON
- Do NOT include nested JSON objects within the message content
- Do NOT include quotes, backslashes, or escape characters in the message content
- Each message should be clean, readable text without any JSON formatting
- AVOID control characters, tabs, or complex formatting that could break JSON parsing
- Use simple line breaks (\\n) for email paragraph separation, not actual newlines in JSON

**CRITICAL INSTRUCTIONS:**
- User's TARGET ROLE: ${input.role} - This is the position they are seeking/targeting. Reference this role appropriately.
- When referencing the user's background, ONLY use information from their "Highlights" and "Resume Content" (if provided).
- NEVER invent or assume job titles, experiences, or skills not explicitly mentioned in the user's information.
- If resume content is provided, use it to personalize the message with specific skills, experiences, and achievements that align with the target role.

Generate TWO outputs ONLY:

- Cold Email (90–100 words): natural, human, and value-driven. Personalize with company-specific insights and key highlights from user input. 
  Structure:
    1. Start with "Subject: ..." (compelling but not click-baity)
    2. Direct, respectful greeting by name if possible (use the CONTACT's name from the verified insights, NOT the user's name from resume).
    3. One-line intro: who you are as it relates to the TARGET ROLE + 1 relevant credential/achievement from YOUR highlights/resume.
    4. 2–3 short sentences connecting your skills and key highlights (from user input) to their current needs or recent initiatives (from provided research).
    5. End with one clear, low-pressure call-to-action (e.g., "Happy to chat if this aligns").
    6. End with a professional closing (e.g., "Best regards," or "Best,")
  CRITICAL EMAIL FORMATTING: 
    - Subject line should be on its own line
    - Use \\n for line breaks in the JSON string (not actual newlines)
    - Add blank lines between paragraphs using \\n\\n
    - Maintain proper email structure with clear paragraph breaks
    - Do NOT write as one continuous paragraph - use proper email formatting with line breaks
    - Example: "Subject: Title\\n\\nDear Name,\\n\\nParagraph 1\\n\\nParagraph 2\\n\\nBest regards"
  Tone: Apply the ${toneConfig.label.toLowerCase()} writing style while maintaining professionalism.

- LinkedIn (exactly 44 words): connection-oriented, same personalization style as the email, START WITH "Hi" or "Hey" followed by the contact's name (from verified insights, NOT from resume), no formal sign-offs, written in one smooth flow using ${toneConfig.label.toLowerCase()} tone.

CRITICAL RULES:
- Return ONLY the JSON object: {"linkedin":"message content here","email":"email content here"}
- Do NOT include any extra text, explanations, markdown formatting, or additional properties.
- The message content itself should be plain text without any JSON formatting or escape characters.
- DO NOT include email addresses, contact information, or signatures in the message content.
- CONTACT NAME HANDLING: 
  * ALWAYS use the PRIMARY CONTACT NAME for greetings when available
  * IF primary contact name is available: Use "Hi [Primary Contact Name]" for LinkedIn and "Dear [Primary Contact Name]" for email
  * IF no primary contact but secondary contact available: Use "Hi [Secondary Contact Name]" for LinkedIn and "Dear [Secondary Contact Name]" for email
  * IF NO contact name available: Use "Hi there" for LinkedIn and "Hi" for email (DO NOT use any name from resume content)
  * NEVER use the user's name from resume content as the contact greeting
- LinkedIn messages MUST start with "Hi [Contact Name]" or "Hey [Contact Name]" when contact is known, or "Hi there" when unknown.
- Email greetings should use "Dear [Contact Name]" or "Hi [Contact Name]" when contact is known, or "Hi" when unknown.
- MAINTAIN PERFECT spelling and grammar - double-check every word before responding.
- When referencing the user's key highlights, use them EXACTLY as provided for accuracy - do not paraphrase or modify their content.
- The email content should be complete and professional without requiring additional contact information.
- APPLY THE SPECIFIED TONE: ${toneConfig.description}
- USE THE PROVIDED EXAMPLES AS STYLE REFERENCE while adapting content to the specific context.`;

const user = `Company: ${input.company}
Role: ${input.role}
Highlights: ${input.highlights}${input.resumeContent ? `
Resume Content: ${input.resumeContent}` : ''}

TARGET ROLE FOR USER: ${input.role}

CONTACT INFORMATION:
${(() => {
  const contactAny = input.verified.contact as any;
  // Handle new two-contact structure
  if (contactAny?.primary_contact || contactAny?.secondary_contact) {
    const contacts = [];
    if (contactAny.primary_contact) {
      contacts.push(`Primary Contact: ${contactAny.primary_contact.name || 'NOT AVAILABLE'} - ${contactAny.primary_contact.title || 'NOT AVAILABLE'}`);
    }
    if (contactAny.secondary_contact) {
      contacts.push(`Secondary Contact: ${contactAny.secondary_contact.name || 'NOT AVAILABLE'} - ${contactAny.secondary_contact.title || 'NOT AVAILABLE'}`);
    }
    return contacts.join('\n');
  }
  // Handle legacy single contact structure
  return `${contactAny?.name ? `Contact Name: ${contactAny.name}` : 'Contact Name: NOT AVAILABLE'}
${contactAny?.title ? `Contact Title: ${contactAny.title}` : 'Contact Title: NOT AVAILABLE'}`;
})()}

PRIMARY CONTACT FOR GREETING:
${(() => {
  const contactAny = input.verified.contact as any;
  // Prioritize primary contact for greetings
  if (contactAny?.primary_contact?.name) {
    return `Use name: ${contactAny.primary_contact.name}`;
  }
  // Fall back to secondary contact if no primary available
  if (contactAny?.secondary_contact?.name) {
    return `Use name: ${contactAny.secondary_contact.name}`;
  }
  // Legacy single contact structure
  if (contactAny?.name) {
    return `Use name: ${contactAny.name}`;
  }
  return 'Use generic greeting (no name available)';
})()}

Verified insights: ${JSON.stringify(input.verified)}

${input.resumeContent ? 'PERSONALIZATION INSTRUCTION: Use the resume content to create highly personalized and relevant outreach messages. Reference specific skills, experiences, or achievements from the resume that align with the company\'s needs and the target role. Make the connection clear and compelling.' : ''}

IMPORTANT: When addressing contacts in messages:
1. ALWAYS use the name specified in "PRIMARY CONTACT FOR GREETING" section above
2. If Contact Name is "NOT AVAILABLE", use generic greetings like "Hi there" (LinkedIn) or "Hi" (email)
3. NEVER use names from resume content for contact greetings
4. BE CONSISTENT - the same contact name should be used throughout both email and LinkedIn message

Output must be strictly valid JSON with ONLY "linkedin" and "email" properties — nothing extra.`;


  const { content } = await callGroq(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { model: "llama3-70b-8192", temperature: 0.5 }
  );

  let cleanContent = "";
  
  try {
    // Clean the content to ensure it's valid JSON
    cleanContent = content.trim();
    
    // Remove any text before the first {
    const firstBrace = cleanContent.indexOf('{');
    if (firstBrace > 0) {
      cleanContent = cleanContent.substring(firstBrace);
    }
    
    // Remove any text after the last }
    const lastBrace = cleanContent.lastIndexOf('}');
    if (lastBrace >= 0 && lastBrace < cleanContent.length - 1) {
      cleanContent = cleanContent.substring(0, lastBrace + 1);
    }
    
    // Enhanced JSON sanitization to handle control characters
    cleanContent = cleanContent
      // Replace unescaped newlines with escaped ones
      .replace(/\n/g, '\\n')
      // Replace unescaped tabs with escaped ones  
      .replace(/\t/g, '\\t')
      // Replace unescaped carriage returns
      .replace(/\r/g, '\\r')
      // Replace other problematic control characters
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Fix any double-escaped quotes that might have been created
      .replace(/\\\\"/g, '\\"')
      // Ensure proper quote escaping within JSON strings
      .replace(/"([^"\\]*)"/g, (match, content) => {
        // Only escape quotes that aren't already escaped
        const escapedContent = content.replace(/(?<!\\)"/g, '\\"');
        return `"${escapedContent}"`;
      });
    
    const parsed = JSON.parse(cleanContent);
    
    // Extract and validate the message content with guardrails
    let linkedin: string = String(parsed.linkedin || "").trim();
    let email: string = String(parsed.email || "").trim();
    
    // GUARDRAILS: Clean up any JSON artifacts or unwanted formatting
    linkedin = cleanJsonArtifacts(linkedin);
    email = cleanJsonArtifacts(email);
    
    // GUARDRAILS: Validate content structure
    linkedin = validateLinkedInMessage(linkedin);
    email = validateEmailMessage(email);
    
    // GUARDRAILS: Final content checks
    if (!linkedin || linkedin.length < 10) {
      linkedin = generateFallbackLinkedIn(input);
    }
    
    if (!email || email.length < 20) {
      email = generateFallbackEmail(input);
    }
    
    const result = { linkedin, email };
    console.log("Messaging Agent Final Output:", result);
    return result;
  } catch (parseError) {
    console.error("Messaging Agent Parse Error:", parseError);
    console.error("Raw AI Response:", content);
    console.error("Cleaned Content for JSON Parse:", cleanContent);
    
    // Try to extract content manually if JSON parsing fails
    let fallbackLinkedin = "";
    let fallbackEmail = "";
    
    try {
      // Simple regex extraction as last resort
      const linkedinMatch = content.match(/"linkedin"\s*:\s*"([^"]+)"/);
      const emailMatch = content.match(/"email"\s*:\s*"([^"]+)"/);
      
      if (linkedinMatch) {
        fallbackLinkedin = linkedinMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
      }
      if (emailMatch) {
        fallbackEmail = emailMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
      }
    } catch (regexError) {
      console.error("Regex extraction also failed:", regexError);
    }
    
    // Enhanced fallback with proper content generation
    return {
      linkedin: fallbackLinkedin || generateFallbackLinkedIn(input),
      email: fallbackEmail || generateFallbackEmail(input)
    };
  }
}

export async function rephraseLinkedInTo22Words(
  linkedin: string, 
  tone?: WritingTone, 
  context?: {
    resumeContent?: string;
    company?: string;
    role?: string;
    highlights?: string;
  }
): Promise<string> {
  const toneConfig = getToneConfig(tone || getDefaultTone());
  
  // Enhanced system prompt with resume context when available
  let systemPrompt = `You are a professional message editor. Rewrite the given LinkedIn message to exactly 22 words while preserving the core value proposition and maintaining a ${toneConfig.label.toLowerCase()} tone. ${toneConfig.systemPrompt}`;
  
  if (context?.resumeContent) {
    systemPrompt += `\n\nPersonalization Context:\nCompany: ${context.company || 'N/A'}\nRole: ${context.role || 'N/A'}\nHighlights: ${context.highlights || 'N/A'}\nResume Content: ${context.resumeContent}\n\nUSE THIS RESUME CONTENT to make the 22-word message more personalized and relevant to the target role and company.`;
  }
  
  systemPrompt += '\n\nCRITICAL: Return ONLY the rewritten 22-word message. Do not include any explanations, instructions, additional text, JSON formatting, or quotes before or after the message.';
  
  const { content } = await callGroq(
    [
      { 
        role: "system", 
        content: systemPrompt
      },
      { role: "user", content: linkedin },
    ],
    { model: "llama3-70b-8192", temperature: 0.5 }
  );
  
  // Apply guardrails to prevent JSON output
  let cleanedContent = cleanJsonArtifacts(content.trim());
  cleanedContent = validateLinkedInMessage(cleanedContent);
  
  // Ensure it's roughly 22 words
  const words = cleanedContent.split(/\s+/).filter(word => word.length > 0);
  if (words.length > 25) {
    cleanedContent = words.slice(0, 22).join(' ');
  }
  
  return cleanedContent || linkedin; // Fallback to original if cleaning fails
}

export async function rephraseEmailWithTone(
  email: string, 
  tone: WritingTone,
  context?: {
    resumeContent?: string;
    company?: string;
    role?: string;
    highlights?: string;
  }
): Promise<string> {
  const toneConfig = getToneConfig(tone);
  
  // Enhanced system prompt with resume context when available
  let systemPrompt = `Rewrite this email maintaining the same structure and core message but applying ${toneConfig.label.toLowerCase()} tone: ${toneConfig.systemPrompt}. 

Style Reference: ${toneConfig.exampleEmail}`;

  if (context?.resumeContent) {
    systemPrompt += `\n\nPersonalization Context:\nCompany: ${context.company || 'N/A'}\nRole: ${context.role || 'N/A'}\nHighlights: ${context.highlights || 'N/A'}\nResume Content: ${context.resumeContent}\n\nUSE THIS RESUME CONTENT to make the email more personalized and relevant to the target role and company while maintaining the specified tone.`;
  }
  
  systemPrompt += '\n\nKeep it 90-100 words and maintain the Subject line format. Return ONLY the email content with no additional formatting, explanations, or JSON structures.';
  
  const { content } = await callGroq(
    [
      { 
        role: "system", 
        content: systemPrompt
      },
      { role: "user", content: email },
    ],
    { model: "llama3-70b-8192", temperature: 0.5 }
  );
  
  // Apply guardrails to prevent JSON output
  let cleanedContent = cleanJsonArtifacts(content.trim());
  cleanedContent = validateEmailMessage(cleanedContent);
  
  return cleanedContent || email; // Fallback to original if cleaning fails
}

export async function rephraseLinkedInWithTone(
  linkedin: string, 
  tone: WritingTone,
  context?: {
    resumeContent?: string;
    company?: string;
    role?: string;
    highlights?: string;
  }
): Promise<string> {
  const toneConfig = getToneConfig(tone);
  
  // Enhanced system prompt with resume context when available
  let systemPrompt = `Rewrite this LinkedIn message maintaining the same core message but applying ${toneConfig.label.toLowerCase()} tone: ${toneConfig.systemPrompt}. 

Style Reference: ${toneConfig.exampleLinkedIn}`;

  if (context?.resumeContent) {
    systemPrompt += `\n\nPersonalization Context:\nCompany: ${context.company || 'N/A'}\nRole: ${context.role || 'N/A'}\nHighlights: ${context.highlights || 'N/A'}\nResume Content: ${context.resumeContent}\n\nUSE THIS RESUME CONTENT to make the LinkedIn message more personalized and relevant to the target role and company while maintaining the specified tone.`;
  }
  
  systemPrompt += '\n\nKeep it around 44 words, concise and engaging. Return ONLY the message content with no additional formatting, explanations, or JSON structures.';
  
  const { content } = await callGroq(
    [
      { 
        role: "system", 
        content: systemPrompt
      },
      { role: "user", content: linkedin },
    ],
    { model: "llama3-70b-8192", temperature: 0.5 }
  );
  
  // Apply guardrails to prevent JSON output
  let cleanedContent = cleanJsonArtifacts(content.trim());
  cleanedContent = validateLinkedInMessage(cleanedContent);
  
  return cleanedContent || linkedin; // Fallback to original if cleaning fails
}


