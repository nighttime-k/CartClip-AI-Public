export type VerifiedField = {
  value: string;
  sourceImage: string | null;
  evidenceText: string | null;
  confidence: number;
  verified: boolean;
};

export type ProductEvidence = {
  field: string;
  sourceImage: string;
  evidenceText: string;
  confidence: number;
};

export type QualityGate = {
  status: "ready" | "review" | "blocked";
  score: number;
  reasons: string[];
  suggestions: string[];
  requiredFieldsMissing: string[];
};

export type CommerceInsights = {
  primaryHook: string;
  customerPain: string;
  desire: string;
  proofMoments: string[];
  objections: string[];
  ctaOptions: string[];
  shotIdeas: string[];
  riskNotes: string[];
};

export type ProductCard = {
  productName: VerifiedField | null;
  price: VerifiedField | null;
  shopName: VerifiedField | null;
  description: VerifiedField | null;
  features: string[];
  category: string;
  targetCustomers: string;
  sellingAngles: string[];
  visualDescription: string;
  missingFields: string[];
  forbiddenClaims: string[];
  coverageScore: number;
  imagesUsed: number;
  evidence: ProductEvidence[];
  validationWarnings: string[];
  qualityGate: QualityGate;
  commerceInsights: CommerceInsights;
  pipelineVersion: string;
};

export type PromptOptions = {
  provider: "auto" | "gemini" | "openrouter";
  videoStyle: string;
  voiceoverLang: string;
  musicStyle: string;
  durationSeconds: number;
  promptCount: number;
};

export type GeneratedClip = {
  clip: number;
  title: string;
  durationSeconds: number;
  prompt: string;
  voiceover: string;
  evidenceUsed: string[];
};

export type PromptResult = {
  provider: string;
  strategy: string;
  prompts: GeneratedClip[];
  negativePrompt: string;
  warnings: string[];
  voiceoverBudgetWords: number;
};
