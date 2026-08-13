type JsonSchema = Record<string, unknown>;

function extractJson(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try { return JSON.parse(cleaned); } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error("The AI provider returned invalid JSON.");
  }
}

export function hasGeminiKey(): boolean {
  return Boolean(process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_FREE);
}

export function hasOpenRouterKey(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

export async function callGemini(parts: Array<Record<string, unknown>>, schema?: JsonSchema): Promise<unknown> {
  const key = process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_FREE;
  if (!key) throw new Error("GEMINI_API_KEY is not configured on the server.");
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
        ...(schema ? { responseSchema: schema } : {}),
      },
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Gemini request failed (${response.status}).`);
  const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
  if (!text) throw new Error("Gemini returned an empty response.");
  return extractJson(text);
}

export async function callOpenRouter(prompt: string): Promise<unknown> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY is not configured on the server.");
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
      "X-Title": "CartClip AI Public Edition",
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "Return one valid JSON object only. Never wrap JSON in markdown." },
        { role: "user", content: prompt },
      ],
      temperature: 0.35,
      response_format: { type: "json_object" },
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`OpenRouter request failed (${response.status}).`);
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const text = payload.choices?.[0]?.message?.content ?? "";
  if (!text) throw new Error("OpenRouter returned an empty response.");
  return extractJson(text);
}
