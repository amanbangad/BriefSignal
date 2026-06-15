# BriefSignal

**Real-time creative intelligence for advertising teams.**

BriefSignal turns a brand name into structured creative brief cards in under 60 seconds — powered by Exa's web search API and OpenAI. It scans trade press, brand newsrooms, creator coverage, and open-web signals in real time, then synthesizes the findings into platform-native ad briefs ready to hand to a creative team.

> Built as an FDE take-home assignment demonstrating Exa's API in the advertising market.

---

## Demo

🔗 [briefsignal.vercel.app](https://briefsignal.vercel.app)

---

## How It Works

Exa handles retrieval. OpenAI handles synthesis. The pipeline runs in four phases, streamed live to the UI:

```
1. Category inference    →  gpt-4o-mini identifies the brand's product category
2. Signal retrieval      →  Exa runs 3 parallel searches across curated source lists
3. Competitor scan       →  (optional) Exa searches competitor creative signals
4. Brief synthesis       →  gpt-4o turns raw signals into structured brief cards
```

Each phase streams progress to the frontend via Server-Sent Events so users see exactly what's happening — not a spinner.

---

## Brief Card Output

Each card includes:

| Field | Description |
|---|---|
| `trend_name` | 3–5 word trend name |
| `heat` | `hot` / `rising` / `cooling` — date and language grounded |
| `why_now` | 2 sentences citing the source article date and urgency |
| `creative_angle` | Platform-native format (Reels, TikTok POV, LinkedIn carousel, etc.) |
| `hook` | Finished ad headline, max 15 words |
| `audience_tension` | The specific consumer unmet need driving the trend |
| `ad_formats` | 2–3 specific placements with aspect ratio and duration |
| `do_dont` | One concrete direction to pursue, one mistake to avoid |
| `example_brands` | 1–2 real brands already executing on the trend |
| `copy_directions` | 2–3 alternative copy angles in different tones |
| `source` + `source_url` | Linked source article from Exa results |

---

## Tech Stack

| Layer | Tool |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| AI SDK | Vercel AI SDK |
| LLM | OpenAI `gpt-4o` (synthesis), `gpt-4o-mini` (category inference) |
| Search | Exa API (neural semantic search) |
| Styling | Tailwind CSS |
| Deployment | Vercel |

---

## Exa Integration

BriefSignal uses three parallel Exa searches per query, each targeting a curated domain list:

```ts
// 1. Category trends — trade press and cultural editorial
searchCategoryTrends(category, platform)
// Sources: adweek.com, digiday.com, thedrum.com, voguebusiness.com, fastcompany.com ...

// 2. Brand chatter — third-party audience perception
searchBrandChatter(brand, category, platform)
// Sources: glossy.co, substack.com, techcrunch.com, morningbrew.com ...

// 3. Social proxy — platform newsrooms and creator press
searchSocialSignals(category, platform)
// Sources: newsroom.tiktok.com, blog.youtube.com, later.com, tubefilter.com ...

// 4. Competitor signals — campaign and creative reporting (optional)
searchCompetitorSignals(competitor, category, platform)
// Sources: adweek.com, campaignlive.com, mediapost.com ...
```

All searches use `type: "neural"` for semantic relevance, `startPublishedDate` for recency, and `highlightQuery` to steer snippet extraction toward advertiser-relevant signals.

---

## Getting Started

### Prerequisites

- Node.js 18+
- An [Exa API key](https://exa.ai)
- An [OpenAI API key](https://platform.openai.com)

### Installation

```bash
git clone https://github.com/amanbangad/BriefSignal.git
cd BriefSignal
npm install
```

### Environment Variables

Create a `.env.local` file in the root:

```env
OPENAI_API_KEY=your_openai_api_key
EXA_API_KEY=your_exa_api_key
```

> If `EXA_API_KEY` is not set, BriefSignal falls back to OpenAI model knowledge and clearly labels results as `model knowledge` in the UI.

### Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
BriefSignal/
├── app/
│   ├── api/generate/route.ts   # Streaming SSE route — Exa + OpenAI pipeline
│   ├── page.tsx                # Root page
│   └── globals.css
├── components/
│   └── brief-signal.tsx        # Main UI component + SearchProgress + DemoNotes
└── lib/
    ├── exa.ts                  # Exa search functions + domain lists + filters
    └── types.ts                # Shared TypeScript types
```

---

## Known Limitations

- **No direct social platform indexing** — TikTok, Instagram, and X are not crawlable by Exa. Social signals are proxied via platform newsrooms (`newsroom.tiktok.com`, `blog.youtube.com`, `about.fb.com`) and creator economy press. Expect a 1–7 day reporting lag.
- **No quantitative metrics** — signals are qualitative editorial and community signals only. No engagement numbers, search volume, or share-of-voice data.
- **Source URL reliability** — OpenAI is instructed to use URLs verbatim from Exa results, but occasionally omits or alters them. Always verify before sharing externally.
- **No persistence** — results are ephemeral. There is no database; refreshing the page clears everything.

---

## License

MIT
