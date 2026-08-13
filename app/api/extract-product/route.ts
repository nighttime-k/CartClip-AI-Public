import { NextResponse } from "next/server";
import { callGemini } from "@/lib/providers";
import { normalizeProductCard } from "@/lib/product";

const MAX_IMAGES = 4;
const MAX_IMAGE_DATA_URL_LENGTH = 6_500_000;

const extractionSchema = {
  type: "OBJECT",
  properties: {
    productName: { type: "OBJECT", properties: { value: { type: "STRING" }, sourceImage: { type: "STRING" }, evidenceText: { type: "STRING" }, confidence: { type: "NUMBER" }, verified: { type: "BOOLEAN" } } },
    price: { type: "OBJECT", nullable: true, properties: { value: { type: "STRING" }, sourceImage: { type: "STRING" }, evidenceText: { type: "STRING" }, confidence: { type: "NUMBER" }, verified: { type: "BOOLEAN" } } },
    shopName: { type: "OBJECT", nullable: true, properties: { value: { type: "STRING" }, sourceImage: { type: "STRING" }, evidenceText: { type: "STRING" }, confidence: { type: "NUMBER" }, verified: { type: "BOOLEAN" } } },
    description: { type: "OBJECT", nullable: true, properties: { value: { type: "STRING" }, sourceImage: { type: "STRING" }, evidenceText: { type: "STRING" }, confidence: { type: "NUMBER" }, verified: { type: "BOOLEAN" } } },
    features: { type: "ARRAY", items: { type: "STRING" } }, category: { type: "STRING" }, targetCustomers: { type: "STRING" },
    sellingAngles: { type: "ARRAY", items: { type: "STRING" } }, visualDescription: { type: "STRING" }, missingFields: { type: "ARRAY", items: { type: "STRING" } },
    forbiddenClaims: { type: "ARRAY", items: { type: "STRING" } }, validationWarnings: { type: "ARRAY", items: { type: "STRING" } },
    evidence: { type: "ARRAY", items: { type: "OBJECT", properties: { field: { type: "STRING" }, sourceImage: { type: "STRING" }, evidenceText: { type: "STRING" }, confidence: { type: "NUMBER" } } } },
    commerceInsights: { type: "OBJECT", properties: { primaryHook: { type: "STRING" }, customerPain: { type: "STRING" }, desire: { type: "STRING" }, proofMoments: { type: "ARRAY", items: { type: "STRING" } }, objections: { type: "ARRAY", items: { type: "STRING" } }, ctaOptions: { type: "ARRAY", items: { type: "STRING" } }, shotIdeas: { type: "ARRAY", items: { type: "STRING" } }, riskNotes: { type: "ARRAY", items: { type: "STRING" } } } },
  },
  required: ["productName", "features", "category", "targetCustomers", "sellingAngles", "visualDescription", "missingFields", "forbiddenClaims", "validationWarnings", "evidence", "commerceInsights"],
};

export async function POST(request: Request) {
  try {
    const body = await request.json() as { images?: unknown };
    if (!Array.isArray(body.images) || body.images.length < 1 || body.images.length > MAX_IMAGES) {
      return NextResponse.json({ success: false, error: "Choose between 1 and 4 product images." }, { status: 400 });
    }
    const images = body.images as unknown[];
    if (images.some((image) => typeof image !== "string" || !image.startsWith("data:image/") || image.length > MAX_IMAGE_DATA_URL_LENGTH)) {
      return NextResponse.json({ success: false, error: "Every file must be a valid image under 5 MB." }, { status: 400 });
    }
    const imageParts = (images as string[]).map((image, index) => {
      const match = image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
      if (!match) throw new Error(`Image ${index + 1} is not a supported data URL.`);
      return { inlineData: { mimeType: match[1], data: match[2] } };
    });
    const instruction = `Analyze these ${images.length} product screenshots. Extract only information visible in the screenshots. Every verified field needs sourceImage (image_0, image_1...), exact evidenceText, confidence from 0 to 1, and verified=true only when visible. Never infer factual claims. Put creative inferences only in targetCustomers, sellingAngles, and commerceInsights. Identify missing fields, unsupported/risky claims, evidence, and useful commerce angles. Return JSON.`;
    const raw = await callGemini([{ text: instruction }, ...imageParts], extractionSchema);
    return NextResponse.json({ success: true, productCard: normalizeProductCard(raw, images.length) });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Image analysis failed." }, { status: 500 });
  }
}
