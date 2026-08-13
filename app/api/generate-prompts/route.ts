import { NextResponse } from "next/server";
import { generatePrompts } from "@/lib/prompts";
import { validateProductCard } from "@/lib/product";
import type { ProductCard, PromptOptions } from "@/lib/types";

const durations = new Set([4, 6, 8, 10, 15, 30, 60]);

export async function POST(request: Request) {
  try {
    const body = await request.json() as { productCard?: ProductCard; options?: Partial<PromptOptions> };
    if (!body.productCard || !body.options) return NextResponse.json({ success: false, error: "ProductCard and options are required." }, { status: 400 });
    const duration = Number(body.options.durationSeconds);
    const count = Math.max(1, Math.min(5, Math.floor(Number(body.options.promptCount) || 1)));
    const options: PromptOptions = {
      provider: ["auto", "gemini", "openrouter"].includes(body.options.provider || "") ? body.options.provider as PromptOptions["provider"] : "auto",
      videoStyle: String(body.options.videoStyle || "cinematic product demo").slice(0, 120),
      voiceoverLang: String(body.options.voiceoverLang || "Thai").slice(0, 80),
      musicStyle: String(body.options.musicStyle || "modern upbeat").slice(0, 120),
      durationSeconds: durations.has(duration) ? duration : 8,
      promptCount: count,
    };
    const gate = validateProductCard(body.productCard);
    if (gate.status === "blocked") return NextResponse.json({ success: false, error: "ProductCard needs review before generation.", qualityGate: gate }, { status: 422 });
    const result = await generatePrompts({ ...body.productCard, qualityGate: gate }, options);
    return NextResponse.json({ success: true, result });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Prompt generation failed." }, { status: 500 });
  }
}
