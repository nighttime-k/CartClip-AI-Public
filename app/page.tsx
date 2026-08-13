"use client";

import { ChangeEvent, useMemo, useState } from "react";
import Image from "next/image";
import type { ProductCard, PromptResult, VerifiedField } from "@/lib/types";

const styles = ["Cinematic product demo", "UGC review", "Problem → solution", "Unboxing ASMR", "Lifestyle montage", "Studio macro"];
const voices = ["Thai", "English", "No voiceover"];
const music = ["Modern upbeat", "Minimal electronic", "Warm acoustic", "Cinematic pulse", "Lo-fi chill", "No music"];
const durations = [4, 6, 8, 10, 15, 30, 60];

function editableField(value: string): VerifiedField {
  return { value, sourceImage: null, evidenceText: "User-reviewed value", confidence: 1, verified: true };
}

export default function Home() {
  const [images, setImages] = useState<string[]>([]);
  const [card, setCard] = useState<ProductCard | null>(null);
  const [result, setResult] = useState<PromptResult | null>(null);
  const [busy, setBusy] = useState<"analyze" | "generate" | null>(null);
  const [error, setError] = useState("");
  const [provider, setProvider] = useState("auto");
  const [videoStyle, setVideoStyle] = useState(styles[0]);
  const [voiceoverLang, setVoiceoverLang] = useState(voices[0]);
  const [musicStyle, setMusicStyle] = useState(music[0]);
  const [durationSeconds, setDurationSeconds] = useState(8);
  const [promptCount, setPromptCount] = useState(3);

  const previews = useMemo(() => images, [images]);

  async function chooseImages(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []).slice(0, 4);
    setError(""); setCard(null); setResult(null);
    const encoded = await Promise.all(files.map((file) => new Promise<string>((resolve, reject) => {
      if (file.size > 5_000_000) return reject(new Error(`${file.name} is larger than 5 MB.`));
      const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error(`Could not read ${file.name}.`)); reader.readAsDataURL(file);
    })));
    setImages(encoded);
  }

  async function analyze() {
    setBusy("analyze"); setError(""); setResult(null);
    try {
      const response = await fetch("/api/extract-product", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ images }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Analysis failed.");
      setCard(data.productCard);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Analysis failed."); }
    finally { setBusy(null); }
  }

  function edit(name: "productName" | "price" | "shopName" | "description", value: string) {
    if (!card) return;
    setCard({ ...card, [name]: value.trim() ? editableField(value) : null });
  }

  async function generate() {
    if (!card) return;
    setBusy("generate"); setError("");
    try {
      const response = await fetch("/api/generate-prompts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productCard: card, options: { provider, videoStyle, voiceoverLang, musicStyle, durationSeconds, promptCount } }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Generation failed.");
      setResult(data.result);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Generation failed."); }
    finally { setBusy(null); }
  }

  return <main>
    <header className="hero">
      <div className="badge">PUBLIC EDITION · LOCAL-FIRST DEMO</div>
      <h1>Turn product screenshots into <span>evidence-aware video prompts.</span></h1>
      <p>Gemini Vision extracts a structured ProductCard. You review the facts, choose the creative direction, then generate production-ready prompt sequences without login, credits, or payment infrastructure.</p>
    </header>

    <section className="step"><div className="step-number">01</div><div className="panel grow">
      <div className="panel-head"><div><h2>Upload product screenshots</h2><p>Choose 1–4 clear images. Files stay in memory and are sent only to your configured Gemini endpoint.</p></div><span>{images.length}/4</span></div>
      <label className="drop"><input type="file" accept="image/*" multiple onChange={chooseImages}/><strong>Choose screenshots</strong><small>PNG, JPEG or WebP · up to 5 MB each</small></label>
      {previews.length > 0 && <div className="previews">{previews.map((src, index) => <div className="preview" key={index}><Image src={src} alt={`Product screenshot ${index + 1}`} fill unoptimized sizes="(max-width: 720px) 50vw, 25vw"/><span>image_{index}</span></div>)}</div>}
      <button className="primary" disabled={!images.length || !!busy} onClick={analyze}>{busy === "analyze" ? "Analyzing evidence…" : "Analyze product"}</button>
    </div></section>

    {error && <div className="error">{error}</div>}

    {card && <section className="step"><div className="step-number">02</div><div className="panel grow">
      <div className="panel-head"><div><h2>Review ProductCard</h2><p>AI extraction is editable. Your edits become explicit user-reviewed facts.</p></div><div className={`score ${card.qualityGate.status}`}>{card.coverageScore}% coverage</div></div>
      <div className="form-grid">
        <label>Product name<input value={card.productName?.value || ""} onChange={(e) => edit("productName", e.target.value)}/></label>
        <label>Price<input value={card.price?.value || ""} onChange={(e) => edit("price", e.target.value)}/></label>
        <label>Shop name<input value={card.shopName?.value || ""} onChange={(e) => edit("shopName", e.target.value)}/></label>
        <label>Category<input value={card.category} onChange={(e) => setCard({ ...card, category: e.target.value })}/></label>
        <label className="wide">Description<textarea value={card.description?.value || ""} onChange={(e) => edit("description", e.target.value)}/></label>
        <label className="wide">Features (one per line)<textarea value={card.features.join("\n")} onChange={(e) => setCard({ ...card, features: e.target.value.split("\n").map((x) => x.trim()).filter(Boolean) })}/></label>
        <label>Target customers<input value={card.targetCustomers} onChange={(e) => setCard({ ...card, targetCustomers: e.target.value })}/></label>
        <label>Selling angles<input value={card.sellingAngles.join(", ")} onChange={(e) => setCard({ ...card, sellingAngles: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })}/></label>
      </div>
      <div className="evidence"><h3>Evidence lock</h3>{card.evidence.length ? card.evidence.map((item, i) => <div className="evidence-row" key={i}><code>{item.field}</code><span>{item.evidenceText}</span><small>{item.sourceImage} · {Math.round(item.confidence * 100)}%</small></div>) : <p>No evidence captured. Add clearer screenshots before relying on factual claims.</p>}</div>
      <div className="gate"><strong>Quality gate: {card.qualityGate.status}</strong><span>{card.qualityGate.score}/100</span>{card.qualityGate.reasons.map((reason) => <p key={reason}>{reason}</p>)}</div>
    </div></section>}

    {card && <section className="step"><div className="step-number">03</div><div className="panel grow">
      <div className="panel-head"><div><h2>Set creative direction</h2><p>Duration automatically controls shot density and voiceover word budget.</p></div></div>
      <div className="form-grid settings">
        <label>Provider<select value={provider} onChange={(e) => setProvider(e.target.value)}><option value="auto">Auto fallback</option><option value="gemini">Gemini</option><option value="openrouter">OpenRouter</option></select></label>
        <label>Video style<select value={videoStyle} onChange={(e) => setVideoStyle(e.target.value)}>{styles.map((x) => <option key={x}>{x}</option>)}</select></label>
        <label>Voiceover<select value={voiceoverLang} onChange={(e) => setVoiceoverLang(e.target.value)}>{voices.map((x) => <option key={x}>{x}</option>)}</select></label>
        <label>Background music<select value={musicStyle} onChange={(e) => setMusicStyle(e.target.value)}>{music.map((x) => <option key={x}>{x}</option>)}</select></label>
        <label>Duration<select value={durationSeconds} onChange={(e) => setDurationSeconds(Number(e.target.value))}>{durations.map((x) => <option key={x} value={x}>{x} seconds</option>)}</select></label>
        <label>Clips / prompts<select value={promptCount} onChange={(e) => setPromptCount(Number(e.target.value))}>{[1,2,3,4,5].map((x) => <option key={x}>{x}</option>)}</select></label>
      </div>
      <button className="primary" disabled={!!busy} onClick={generate}>{busy === "generate" ? "Building prompt series…" : "Generate video prompts"}</button>
    </div></section>}

    {result && <section className="step"><div className="step-number">04</div><div className="panel grow results">
      <div className="panel-head"><div><h2>Prompt series</h2><p>{result.provider} · voiceover budget {result.voiceoverBudgetWords} words per clip</p></div></div>
      <div className="strategy"><strong>Strategy</strong><p>{result.strategy}</p></div>
      {result.prompts.map((clip) => <article className="clip" key={clip.clip}><div className="clip-head"><div><span>CLIP {clip.clip} · {clip.durationSeconds}s</span><h3>{clip.title}</h3></div><button onClick={() => navigator.clipboard.writeText(`${clip.prompt}\n\nVoiceover: ${clip.voiceover}\n\nNegative prompt: ${result.negativePrompt}`)}>Copy</button></div><pre>{clip.prompt}</pre><div className="voice"><strong>Voiceover</strong><p>{clip.voiceover || "—"}</p></div>{clip.evidenceUsed.length > 0 && <small>Evidence: {clip.evidenceUsed.join(" · ")}</small>}</article>)}
      <div className="negative"><strong>Universal negative prompt</strong><p>{result.negativePrompt}</p><button onClick={() => navigator.clipboard.writeText(result.negativePrompt)}>Copy negative prompt</button></div>
    </div></section>}

    <footer>CartClip AI Public Edition · Bring your own API key · Provider secrets remain server-side</footer>
  </main>;
}
