import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// UI Guardrails for message content
export function sanitizeMessageContent(content: string): string {
  if (!content || typeof content !== 'string') {
    return '';
  }

  // Remove any JSON formatting that might have leaked through
  let cleaned = content
    .replace(/^["']|["']$/g, '') // Remove surrounding quotes
    .replace(/\\n/g, '\n') // Convert escaped newlines
    .replace(/\\"/g, '"') // Convert escaped quotes
    .replace(/\\'/g, "'") // Convert escaped single quotes
    .replace(/\\\\/g, '\\') // Convert escaped backslashes
    .trim();

  // If the content looks like a JSON object, try to extract the actual message
  if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
    try {
      const parsed = JSON.parse(cleaned);
      // Try to extract email or linkedin content
      if (parsed.email && typeof parsed.email === 'string') {
        cleaned = parsed.email;
      } else if (parsed.linkedin && typeof parsed.linkedin === 'string') {
        cleaned = parsed.linkedin;
      } else {
        // If it's a JSON object but doesn't have expected properties, 
        // return a fallback message
        cleaned = 'Message content could not be properly formatted. Please regenerate.';
      }
    } catch (e) {
      // If JSON parsing fails, treat as malformed content
      cleaned = 'Message content could not be properly formatted. Please regenerate.';
    }
  }

  // Additional safety checks
  if (cleaned.includes('{"') || cleaned.includes('"}')) {
    // Contains JSON fragments, clean them out
    cleaned = cleaned.replace(/\{[^}]*\}/g, '').trim();
  }

  // If content is still empty or too short, provide feedback
  if (!cleaned || cleaned.length < 5) {
    return 'Message content could not be properly formatted. Please regenerate.';
  }

  return cleaned;
}