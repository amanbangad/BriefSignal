/**
 * BriefSignal — Real-time creative intelligence for Meta advertising teams
 * FDE Take-Home Assignment · Powered by Exa + Claude
 *
 * Stack: React 18 (no build step — uses UMD CDN builds for demo)
 * To deploy standalone: wrap in a Vite/CRA project, install react + react-dom,
 * swap CDN script tags for npm imports, and add VITE_ANTHROPIC_API_KEY to .env
 *
 * API key note: In production, proxy the Anthropic API call through your own
 * backend to keep the key server-side. Never ship API keys in client bundles.
 */

import { useState, useEffect, useRef } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  "Beauty & Skincare",
  "CPG & FMCG",
  "Fashion & Apparel",
  "Food & Beverage",
  "Health & Wellness",
  "Sports & Fitness",
  "Entertainment & Media",
  "Home & Lifestyle",
];

const LOADING_MESSAGES = [
  "Scanning Reddit for consumer conversations…",
  "Checking trade publications for trend signals…",
  "Searching creator blogs and brand newsrooms…",
  "Detecting cultural moments across the open web…",
  "Building your brief cards…",
];

const HEAT_CONFIG = {
  hot: {
    chipClass: "chip-hot",
    label: "Trending now",
  },
  rising: {
    chipClass: "chip-rising",
    label: "Building fast",
  },
  cooling: {
    chipClass: "chip-cooling",
    label: "Losing steam",
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function BriefSignal() {
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("Beauty & Skincare");
  const [audience, setAudience] = useState("");
  const [loading, setLoading] = useState(false);
  const [msgIdx, setMsgIdx] = useState(0);
  const [cards, setCards] = useState([]);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(null);
  const timerRef = useRef(null);

  // Cycle loading messages while searching
  useEffect(() => {
    if (loading) {
      setMsgIdx(0);
      timerRef.current = setInterval(
        () => setMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length),
        2200
      );
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [loading]);

  const copyHook = (text, idx) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(idx);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const generate = async () => {
    if (!brand.trim()) return;
    setLoading(true);
    setCards([]);
    setError(null);

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,

          // System prompt instructs Claude to use Exa, then return structured JSON
          system: `You are a creative intelligence analyst for ad agencies building Meta (Instagram/Facebook) campaigns.

Use the Exa search tool to find REAL, current signals from this week. Run at least 2 searches:
1. Trending topics in ${category} right now
2. Consumer conversations or news about "${brand}" or ${category}

Return ONLY a valid JSON array of exactly 3 brief cards, zero other text:
[{"trend_name":"3-5 word name","heat":"hot","why_now":"2 sentences from search findings","creative_angle":"specific Meta ad angle","hook":"ad headline max 15 words","source":"publication or site","signal":"1 sentence what you found"}]
heat must be exactly one of: hot, rising, cooling`,

          messages: [
            {
              role: "user",
              content: `Brand: ${brand}
Category: ${category}
Audience: ${audience || "general consumers"}

Search for live signals and return 3 brief cards as JSON array only.`,
            },
          ],

          // Exa MCP integration — this is the key differentiator
          mcp_servers: [
            {
              type: "url",
              url: "https://mcp.exa.ai/mcp",
              name: "exa",
            },
          ],
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message || "API error");
      }

      // Extract JSON from response — handle multiple text blocks from MCP tool calls
      const allText = (data.content || [])
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("\n");

      const jsonMatch = allText.match(
        /\[\s*\{[\s\S]*?\}\s*(?:,\s*\{[\s\S]*?\}\s*)*\]/
      );

      if (!jsonMatch) {
        throw new Error("Could not parse brief cards from response. Try again.");
      }

      const parsed = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error("Empty response from API.");
      }

      setCards(parsed);
    } catch (e) {
      setError(e.message || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setCards([]);
    setError(null);
  };

  const canGenerate = !loading && brand.trim().length > 0;

  return (
    <div className="wrap">
      {/* Header */}
      <header className="header">
        <div className="logo-row">
          <span className="logo-name">BriefSignal</span>
          <span className="logo-pill">powered by Exa</span>
        </div>
        <p className="subtitle">
          Real-time creative intelligence for Meta advertising teams
        </p>
      </header>

      {/* How it works */}
      <div className="how-it-works">
        <span className="step">Exa scans Reddit, trade press, brand newsrooms</span>
        <span className="arrow">→</span>
        <span className="step">Claude synthesizes trend signals</span>
        <span className="arrow">→</span>
        <span className="step">Brief cards ready for your creative team</span>
      </div>

      {/* Input form */}
      <div className="form">
        <div className="fields">
          <label className="field">
            <span className="field-label">Brand</span>
            <input
              placeholder="Nike, Glossier, Oatly…"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && generate()}
            />
          </label>
          <label className="field">
            <span className="field-label">Category</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Target audience</span>
            <input
              placeholder="Gen Z women 18-24…"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && generate()}
            />
          </label>
        </div>
        <button
          onClick={generate}
          disabled={!canGenerate}
          className="generate-btn"
        >
          {loading ? "Searching…" : "Generate brief cards →"}
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="loading-row">
          <span className="loading-dot" />
          <span className="loading-text">{LOADING_MESSAGES[msgIdx]}</span>
        </div>
      )}

      {/* Error state */}
      {error && <div className="error-box">{error}</div>}

      {/* Results */}
      {cards.length > 0 && (
        <section>
          <div className="results-bar">
            <span className="results-label">
              {cards.length} signals detected · {new Date().toLocaleTimeString()}
            </span>
            <button onClick={reset} className="reset-btn">
              New search
            </button>
          </div>
          <div className="card-grid">
            {cards.map((card, i) => {
              const heat = HEAT_CONFIG[card.heat] || HEAT_CONFIG.rising;
              return (
                <div key={i} className="card">
                  <div className="card-top">
                    <span className={`chip ${heat.chipClass}`}>{heat.label}</span>
                    <span className="card-index">{String(i + 1).padStart(2, "0")}</span>
                  </div>

                  <h3 className="trend-name">{card.trend_name}</h3>

                  <div className="block">
                    <span className="block-label">Why now</span>
                    <p className="block-text">{card.why_now}</p>
                  </div>

                  <div className="block">
                    <span className="block-label">Creative angle</span>
                    <p className="block-text">{card.creative_angle}</p>
                  </div>

                  <div className="hook-box">
                    <div className="hook-header">
                      <span className="hook-label">Ad hook</span>
                      <button
                        className="copy-btn"
                        onClick={() => copyHook(card.hook, i)}
                      >
                        {copied === i ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <p className="hook-text">"{card.hook}"</p>
                  </div>

                  <div className="source-row">
                    <p className="source-text">
                      Signal · {card.source} — {card.signal}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Empty state */}
      {!loading && !error && cards.length === 0 && (
        <div className="empty">
          <p className="empty-title">Waiting for a signal</p>
          <p className="empty-body">
            Enter a brand to scan Reddit, trade press, creator blogs, and brand
            newsrooms for what is moving right now — not last month's listicles.
            Exa searches the open web in real time.
          </p>
        </div>
      )}

      <footer className="footer">
        <span>BriefSignal · FDE take-home assignment</span>
        <span>Exa real-time web search · zero cached results</span>
      </footer>
    </div>
  );
}

/*
 * ─── Deployment notes ─────────────────────────────────────────────────────────
 *
 * 1. Clone into a Vite project: npm create vite@latest briefsignal -- --template react
 * 2. Copy this file to src/App.jsx
 * 3. Add CSS (see styles below) to src/index.css or App.css
 * 4. Create a backend proxy at /api/messages that forwards to Anthropic with your key
 *    (never expose ANTHROPIC_API_KEY in the client bundle)
 * 5. Deploy to Vercel / Netlify — the serverless function handles the proxy
 *
 * For the demo, the Claude.ai artifact environment handles auth automatically.
 *
 * ─── CSS to add to your stylesheet ───────────────────────────────────────────
 *
 * (The Claude artifact version uses CSS variables from the host design system.
 * For standalone deployment, replace var(--color-*) with your own tokens.)
 */
