import type { ProductCard, QualityGate, VerifiedField } from "@/lib/types";

const riskyClaimPatterns = [
  /(?:guaranteed|รับประกันผล|เห็นผลแน่นอน)/i,
  /(?:cure|รักษาโรค|หายขาด)/i,
  /(?:officially approved|อย\.|fda approved)/i,
  /(?:number one|อันดับ\s*1|ดีที่สุดในโลก)/i,
];

function clean(value: unknown, max = 600): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function list(value: unknown, maxItems = 12): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => clean(item, 180)).filter(Boolean).slice(0, maxItems);
}

function clamp(value: unknown): number {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : 0;
}

function field(value: unknown): VerifiedField | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const text = clean(item.value);
  if (!text) return null;
  return {
    value: text,
    sourceImage: clean(item.sourceImage, 40) || null,
    evidenceText: clean(item.evidenceText, 240) || null,
    confidence: clamp(item.confidence),
    verified: item.verified !== false,
  };
}

export function detectRiskyClaims(card: Partial<ProductCard>): string[] {
  const content = [
    card.productName?.value,
    card.description?.value,
    ...(card.features ?? []),
    ...(card.sellingAngles ?? []),
  ].filter(Boolean).join(" ");
  return riskyClaimPatterns.filter((pattern) => pattern.test(content)).map((pattern) => pattern.source);
}

export function buildQualityGate(card: Partial<ProductCard>): QualityGate {
  const missing: string[] = [];
  if (!card.productName?.value) missing.push("productName");
  if (!card.description?.value && !(card.features?.length)) missing.push("descriptionOrFeatures");
  const evidenceCount = card.evidence?.length ?? 0;
  const risky = [...(card.forbiddenClaims ?? []), ...detectRiskyClaims(card)];
  const coverage = card.coverageScore ?? 0;
  let score = Math.min(100, coverage + Math.min(20, evidenceCount * 4));
  score -= missing.length * 20 + risky.length * 8;
  score = Math.max(0, score);
  const reasons = [
    ...missing.map((name) => `Required information is missing: ${name}`),
    ...(evidenceCount === 0 ? ["No screenshot evidence was captured."] : []),
    ...(risky.length ? ["Potentially risky or unsupported claims require review."] : []),
  ];
  return {
    status: missing.length ? "blocked" : score >= 60 ? "ready" : "review",
    score,
    reasons,
    suggestions: [
      ...(evidenceCount < 2 ? ["Add screenshots that clearly show product name and key features."] : []),
      ...(coverage < 70 ? ["Review and complete the missing product fields before generation."] : []),
    ],
    requiredFieldsMissing: missing,
  };
}

export function normalizeProductCard(input: unknown, imagesUsed: number): ProductCard {
  const data = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const evidence = Array.isArray(data.evidence) ? data.evidence.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const evidenceText = clean(row.evidenceText, 240);
    if (!evidenceText) return [];
    return [{
      field: clean(row.field, 80),
      sourceImage: clean(row.sourceImage, 40) || "image_0",
      evidenceText,
      confidence: clamp(row.confidence),
    }];
  }).slice(0, 16) : [];

  const productName = field(data.productName);
  const description = field(data.description);
  const features = list(data.features);
  const populated = [productName, field(data.price), field(data.shopName), description,
    features.length, clean(data.category), clean(data.targetCustomers), list(data.sellingAngles).length,
    clean(data.visualDescription)].filter(Boolean).length;
  const coverageScore = Math.round((populated / 9) * 100);
  const insights = data.commerceInsights && typeof data.commerceInsights === "object"
    ? data.commerceInsights as Record<string, unknown> : {};

  const card: ProductCard = {
    productName,
    price: field(data.price),
    shopName: field(data.shopName),
    description,
    features,
    category: clean(data.category, 120),
    targetCustomers: clean(data.targetCustomers),
    sellingAngles: list(data.sellingAngles, 8),
    visualDescription: clean(data.visualDescription),
    missingFields: list(data.missingFields, 16),
    forbiddenClaims: list(data.forbiddenClaims, 16),
    coverageScore,
    imagesUsed,
    evidence,
    validationWarnings: list(data.validationWarnings, 16),
    qualityGate: { status: "review", score: 0, reasons: [], suggestions: [], requiredFieldsMissing: [] },
    commerceInsights: {
      primaryHook: clean(insights.primaryHook),
      customerPain: clean(insights.customerPain),
      desire: clean(insights.desire),
      proofMoments: list(insights.proofMoments, 8),
      objections: list(insights.objections, 8),
      ctaOptions: list(insights.ctaOptions, 8),
      shotIdeas: list(insights.shotIdeas, 10),
      riskNotes: list(insights.riskNotes, 8),
    },
    pipelineVersion: "public-vision-evidence-v1",
  };
  card.forbiddenClaims = Array.from(new Set([...card.forbiddenClaims, ...detectRiskyClaims(card)]));
  card.qualityGate = buildQualityGate(card);
  return card;
}

export function validateProductCard(card: ProductCard): QualityGate {
  return buildQualityGate(card);
}
