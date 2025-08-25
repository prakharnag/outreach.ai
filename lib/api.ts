export type ResearchPoint = { claim: string; source?: { title: string; url: string } };
export type ResearchResult = {
  summary: string;
  // Allow both legacy string[] and structured points; callers should normalize.
  points: Array<string | ResearchPoint>;
  sources?: Array<{ title: string; url: string }>; // optional for display
};

const PPLX_API_KEY = process.env.PPLX_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

type PplxOptions = {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
};

export async function callPerplexity(prompt: string, options?: PplxOptions): Promise<ResearchResult> {
  if (!PPLX_API_KEY) {
    // Simulate if key missing (MVP friendly)
    return {
      summary: `Simulated insights for: ${prompt}`,
      points: [
        { claim: "Recent funding round reported in public sources (simulated)" },
        { claim: "Tech stack mentions React, Next.js, Postgres (simulated)" },
        { claim: "Product updates indicate focus on AI features (simulated)" },
      ],
      sources: [
        { title: "Company Blog", url: "https://example.com/blog" },
        { title: "News", url: "https://example.com/news" },
      ],
    };
  }

  const model = options?.model || "sonar";
  const temperature = options?.temperature ?? 0.2;
  const maxTokens = options?.maxTokens ?? 700;
  const systemPrompt = options?.systemPrompt || "You are a research assistant. Return structured JSON.";

  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${PPLX_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[api] Perplexity error", res.status, text);
    throw new Error(`Perplexity API error: ${res.status}`);
  }
  const json = await res.json();
  const content: string = json?.choices?.[0]?.message?.content || "";
  // Try to parse JSON in content; fallback to text
  try {
    const parsed = JSON.parse(content);
    return parsed as ResearchResult;
  } catch {
    return { summary: content, points: [] };
  }
}

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

/**
 * Gets the appropriate model with fallback for deprecated models
 */
function getModelWithFallback(requestedModel?: string): string {
  // Handle the deprecated llama3-70b-8192 model
  if (requestedModel === "llama3-70b-8192") {
    return "llama-3.3-70b-versatile";
  }
  
  // Return requested model or default
  return requestedModel || "mixtral-8x7b-32768";
}

export async function callGroq(messages: ChatMessage[], opts?: { model?: string; temperature?: number }) {
  if (!GROQ_API_KEY) {
    // Simulate if missing
    return {
      content: messages[messages.length - 1]?.content?.slice(0, 400) || "Simulated response",
    };
  }
  
  const model = getModelWithFallback(opts?.model);
  const temperature = opts?.temperature ?? 0.4;
  
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({ model, messages, temperature }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[api] Groq error", res.status, text);
    throw new Error(`Groq API error: ${res.status}`);
  }
  const json = await res.json();
  const content: string = json?.choices?.[0]?.message?.content || "";
  return { content };
}


