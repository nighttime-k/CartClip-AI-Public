import type { ProductCard, PromptOptions, PromptResult } from "@/lib/types";
import { callGemini, callOpenRouter, hasGeminiKey, hasOpenRouterKey } from "@/lib/providers";

export const NEGATIVE_PROMPT = "Avoid unreadable text, misspelled captions, random symbols, distorted logos, incorrect packaging, changed product colors, warped product shape, invented features, unsupported health or performance claims, fake discounts, unrealistic results, deformed hands, extra fingers, cluttered scenes, excessive blur, low-resolution footage, and camera angles that hide the product.";

function voiceoverBudget(durationSeconds: number, language: string): number {
  const rate = /thai|ไทย/i.test(language) ? 2.2 : 2.5;
  return Math.max(4, Math.floor(durationSeconds * rate));
}

function buildGenerationPrompt(card: ProductCard, options: PromptOptions): string {
  const budget = voiceoverBudget(options.durationSeconds, options.voiceoverLang);
  return `You are a short-form commerce video prompt engineer. Create ${options.promptCount} connected but independently usable video clip prompts.

PRODUCT CARD (the only source of factual product claims):
${JSON.stringify(card, null, 2)}

SETTINGS:
- Video style: ${options.videoStyle}
- Voiceover language: ${options.voiceoverLang}
- Background music: ${options.musicStyle}
- Duration per clip: ${options.durationSeconds} seconds
- Maximum voiceover budget per clip: ${budget} words

EVIDENCE-LOCK RULES:
1. Use a factual claim only when supported by a verified field, screenshot evidence, or explicit user-edited ProductCard data.
2. Never invent certifications, ingredients, materials, discounts, warranty, performance, health results, popularity, or customer reviews.
3. Treat inferred target customers, selling angles, and commerce insights as creative strategy—not verified product facts.
4. Respect forbiddenClaims and riskNotes. If evidence is weak, demonstrate visible form/use instead of making a claim.
5. Keep the product appearance, packaging, colors, labels, and proportions consistent.
6. Each prompt must contain scene, action, camera, lighting, product continuity, audio, voiceover, timing, and transition guidance.
7. Build a useful sequence: hook, proof/demo, benefit framing, then CTA when multiple clips are requested.

Return JSON with: strategy (string), prompts (array), negativePrompt (string), warnings (string array).
Each prompts item must have: clip (number), title (string), durationSeconds (number), prompt (string), voiceover (string), evidenceUsed (string array).
Use this baseline negative prompt: ${NEGATIVE_PROMPT}`;
}

function normalizeResult(data: unknown, provider: string, options: PromptOptions): PromptResult {
  const row = data && typeof data === "object" ? data as Record<string, unknown> : {};
  const prompts = Array.isArray(row.prompts) ? row.prompts.slice(0, options.promptCount).map((item, index) => {
    const clip = item && typeof item === "object" ? item as Record<string, unknown> : {};
    return {
      clip: index + 1,
      title: String(clip.title || `Clip ${index + 1}`).slice(0, 120),
      durationSeconds: options.durationSeconds,
      prompt: String(clip.prompt || "").slice(0, 8000),
      voiceover: String(clip.voiceover || "").slice(0, 1200),
      evidenceUsed: Array.isArray(clip.evidenceUsed) ? clip.evidenceUsed.map(String).slice(0, 8) : [],
    };
  }).filter((clip) => clip.prompt) : [];
  if (!prompts.length) throw new Error("The provider did not return usable prompts.");
  return {
    provider,
    strategy: String(row.strategy || "Evidence-led short-form product story").slice(0, 1200),
    prompts,
    negativePrompt: String(row.negativePrompt || NEGATIVE_PROMPT).slice(0, 4000),
    warnings: Array.isArray(row.warnings) ? row.warnings.map(String).slice(0, 12) : [],
    voiceoverBudgetWords: voiceoverBudget(options.durationSeconds, options.voiceoverLang),
  };
}

export async function generatePrompts(card: ProductCard, options: PromptOptions): Promise<PromptResult> {
  const prompt = buildGenerationPrompt(card, options);
  const order = options.provider === "openrouter" ? ["openrouter"]
    : options.provider === "gemini" ? ["gemini"]
    : [hasOpenRouterKey() ? "openrouter" : "", hasGeminiKey() ? "gemini" : ""].filter(Boolean);
  if (!order.length) throw new Error("Configure GEMINI_API_KEY or OPENROUTER_API_KEY on the server.");
  const failures: string[] = [];
  for (const provider of order) {
    try {
      const result = provider === "openrouter"
        ? await callOpenRouter(prompt)
        : await callGemini([{ text: prompt }]);
      return normalizeResult(result, provider, options);
    } catch (error) {
      failures.push(error instanceof Error ? error.message : `${provider} failed`);
    }
  }
  throw new Error(failures.join(" Fallback: "));
}
