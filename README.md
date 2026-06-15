# BriefSignal

**Real-time creative intelligence for advertising teams.**

BriefSignal turns a brand name into structured creative brief cards in under 60 seconds — powered by Exa's web search API and OpenAI. It scans trade press, brand newsrooms, creator coverage, and open-web signals in real time, then synthesizes the findings into platform-native ad briefs ready to hand to a creative team.

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
