# CartClip AI — Public Edition

CartClip AI turns product screenshots into evidence-aware prompts for short-form product videos. This public edition preserves the core showcase workflow while deliberately excluding production accounts, billing, administration, and private business infrastructure.

## What it does

1. Upload 1–4 product screenshots.
2. Gemini Vision extracts a structured `ProductCard`.
3. Review or edit verified product information, screenshot evidence, coverage, and quality-gate results.
4. Choose video style, voiceover language, background music, duration, and clip count.
5. Generate a connected prompt series through OpenRouter or Gemini.
6. Copy individual prompts and the anti-hallucination negative prompt.

The generation layer applies evidence-lock rules, risky-claim detection, duration-aware shot planning, voiceover word budgets, and product-continuity constraints.

## Architecture

```text
Browser upload
    -> POST /api/extract-product
    -> Gemini Vision (server-side key)
    -> normalized ProductCard + evidence + quality gate
    -> user review/edit
    -> POST /api/generate-prompts
    -> OpenRouter or Gemini fallback (server-side keys)
    -> multi-clip prompts + voiceover + negative prompt
```

API keys are read only inside server route handlers. They are never placed in `NEXT_PUBLIC_*` variables or returned to the browser.

## Requirements

- Node.js 20 or newer
- npm
- A Gemini API key for screenshot analysis
- Optionally, an OpenRouter API key for prompt generation

## Install and run

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

Edit `.env.local` and provide your own credentials:

```dotenv
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_API_KEY_FREE=your_optional_gemini_api_key_here
OPENROUTER_API_KEY=your_optional_openrouter_api_key_here
APP_URL=http://localhost:3000
```

`GEMINI_API_KEY_FREE` is an optional fallback name. At least one Gemini key is required for image analysis. When provider mode is `Auto`, prompt generation tries OpenRouter first when configured and then Gemini.

## Validation

```bash
npm run lint
npm run build
```

## Security notes

- No API key or production credential is included in this repository.
- Keep `.env.local` local; it is ignored by Git.
- Use server environment variables for all provider keys.
- Review AI-extracted facts before using generated marketing content.
- The evidence lock reduces unsupported claims but does not replace human review or legal/compliance advice.

## Intentionally excluded

This edition does not contain production Firebase Authentication, Firestore/Storage integration, user databases, credits or ledgers, wallet, billing, top-up, payment or slip verification, PromptPay, admin/super-admin systems, production monitoring, deployment configuration, or private analytics identifiers.

## License

MIT — see `LICENSE`.
