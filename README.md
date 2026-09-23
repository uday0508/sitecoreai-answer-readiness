# Answer Readiness

**A SitecoreAI Marketplace app that scores Sitecore pages for AI-powered discovery, answer extraction, and citation.**

[![Sitecore Marketplace](https://img.shields.io/badge/Sitecore-Marketplace-blue)](https://portal.sitecorecloud.io/marketplace/details?id=pub-35343dea-8835-4c7d-9f51-02ac96d4dc42)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](#license)

---

## What this is

AI answer engines — ChatGPT, Perplexity, Gemini, Google AI Overviews — do not read pages. They pull short passages and cite them as answers. A page that reads well for a person can still be invisible to AI if it lacks clear structure, direct answers, self-contained sections, concrete facts, or machine-readable freshness and citation signals.

**Answer Readiness** scores every page against those signals and tells you what to fix, inside the SitecoreAI Page Builder.

- **Live demo:** https://sitecoreai-answer-readiness.biztechnosys.com
- **Install:** https://portal.sitecorecloud.io/marketplace/details?id=pub-35343dea-8835-4c7d-9f51-02ac96d4dc42

---

## Features

- **Pages Context Panel** — runs in the SitecoreAI Page Builder sidebar. Instant readiness score, prioritized list of fixes, evidence from the page, and rewrite suggestions.
- **Fullscreen Extension** — site-wide view with every navigation page in a tree, a summary strip with the average score and page distribution, a priority list, and a full report per page.
- **Seven weighted categories** — answer structure, passage integrity, factual density, entity clarity, FAQ readiness, freshness, citation signals.
- **Deterministic engine** — no LLM. Same published HTML + same analysis timestamp + same policy produces the same score.
- **Evidence-first** — every finding carries the sample that triggered it. Heading text, paragraph excerpt, missing schema property, outbound link.
- **Source-tagged** — every finding is labeled with the standard it detects against (`schema.org`, `OGP`, `HTML`) or marked `heuristic` if it is an editorial rule.
- **Disclosed policy** — thresholds, category weights, and point deductions are documented in the in-app Help panel.

---

## How the score works

Seven weighted categories sum to 100:

| Category | Weight | What it checks |
|---|---|---|
| Answer Structure | 30 | Heading hierarchy, opening paragraphs, question-style headings, scannable blocks |
| Passage Integrity | 22 | Self-containment, pronoun density, context-dependent references |
| Factual Density | 17 | Numbers with units, dates, comparisons, concrete claims |
| Entity Clarity | 9 | Definitions, title alignment, author signals, metadata hygiene |
| FAQ Readiness | 8 | FAQPage schema, visible Q&A content, schema-to-content consistency |
| Freshness | 8 | `dateModified`, `article:modified_time`, ISO 8601, staleness threshold |
| Citation Signals | 6 | External source links, named attributions, blockquote cite attributes |

### Standards-based detection vs. editorial heuristics

Every finding carries a `source` field:

- **`open-graph`** — parsed from Open Graph Protocol metadata (`article:modified_time`, `og:updated_time`, `og:url`)
- **`schema-org`** — parsed from schema.org JSON-LD or Microdata (`Article`, `BlogPosting`, `FAQPage`, `dateModified`, `author`)
- **`html-standard`** — parsed from HTML Living Standard elements (`<time>`, `<blockquote cite>`, `<h1>`–`<h6>`, `<link rel="canonical">`, `<a href>`)
- **`robots-exclusion`** — parsed from robots.txt against Google's published crawler documentation (`Google-Extended`)
- **`llms-txt`** — matched against the llms.txt convention (emerging, not a formal standard)
- **`heuristic`** — editorial pattern or threshold chosen by this app

Category weights, point deductions, and thresholds (including the 12-month freshness threshold) are **editorial policy**, not standards. They are disclosed in the in-app Help panel.

### Determinism

The engine is a deterministic rule pipeline. No LLM, classifier, or trained model is used. The freshness rule compares against the analysis timestamp, which is persisted with the result. Re-running the same published HTML against the same policy and timestamp produces the same score.

---

## What this is not

- **Not a ranking score.** It is an internal content-readiness indicator. It does not predict or guarantee citation in any AI surface.
- **Not a fact-checker.** It measures structure and answer-readiness signals, not factual accuracy.
- **Published HTML only.** Unsaved edits in Page Builder are not reflected until the page is published.
- **No AI in the pipeline.** No LLM produces the score.
- **Time-dependent freshness.** The freshness rule compares against the analysis timestamp, so scores can change as content ages.
- **Heuristics are labeled.** Detectors such as the 12-month staleness threshold and English-only attribution matching are editorial rules, tagged `heuristic` in the report.

---

## Tech stack

- **Next.js 14+ (App Router)** — Server Components for metadata, Client Components for interactive UI
- **TypeScript** — full type coverage across the analysis engine
- **Tailwind CSS** — used for layout and typography
- **Montserrat + Orbitron** — brand typography loaded via Google Fonts CDN
- **Sitecore Marketplace SDK** — `@sitecore-marketplace-sdk/client` and `@sitecore-marketplace-sdk/xmc`

No external services. No database. No telemetry.

---

## Project structure

    sitecoreai-answer-readiness/
    ├── app/                                # Next.js App Router
    │   ├── api/
    │   │   ├── analyze/route.ts            # POST — HTML in, AnalysisResult out
    │   │   └── crawler-check/route.ts      # POST — siteUrl in, robots.txt state out
    │   ├── fullscreen/                     # Fullscreen Extension entry point
    │   ├── pages-contextpanel/             # Pages Context Panel entry point
    │   ├── globals.css
    │   ├── layout.tsx
    │   ├── page.tsx                        # Marketing homepage
    │   └── SelfAnalysis.tsx                # Live self-analysis demo
    ├── src/
    │   ├── components/
    │   ├── lib/analysis/
    │   ├── types/
    │   └── utils/
    ├── public/
    ├── .env.example
    ├── next.config.ts
    ├── package.json
    ├── postcss.config.mjs
    ├── README.md
    └── tsconfig.json

### Extension entry points

The app exposes two SitecoreAI extension points, each mapped to a route:

| Extension point | Route | Purpose |
|---|---|---|
| Pages Context Panel | `app/pages-contextpanel/page.tsx` | Sidebar panel — analyzes the current page in Page Builder |
| Fullscreen Extension | `app/fullscreen/page.tsx` | Site-wide view — page tree, average score, priority queue |

Both routes render the same underlying analysis engine from `src/lib/analysis/`. The only differences are the UI shells.

---

## Getting started

### Prerequisites

- Node.js 24+
- A SitecoreAI environment with the Marketplace App registered
- SitecoreAI APIs access enabled in App Studio
- Both extension points configured:
  - **Pages Context Panel**
  - **Fullscreen Extension**

### Installation

    git clone https://github.com/uday0508/sitecoreai-answer-readiness.git
    cd sitecoreai-answer-readiness
    npm install

### Development

    npm run dev

Open one of the three routes:

- **Marketing homepage:** http://localhost:3000
- **Pages Context Panel:** http://localhost:3000/pages-contextpanel
- **Fullscreen Extension:** http://localhost:3000/fullscreen

The two extension routes render standalone in a browser — the Sitecore SDK initializes against `window.parent`, so they show the "waiting for Page Builder" state until opened from inside Sitecore. The marketing homepage's self-analysis section works fully standalone.

### Build

    npm run build
    npm run start

The app deploys to any Next.js-compatible host — Vercel, Render, Netlify, or a self-hosted Node server.

### Testing inside Sitecore

The app runs in two contexts:

1. **Standalone** — open the deployed URL directly. The marketing page renders with a live demo analyzing itself.
2. **Inside SitecoreAI** — install from the Marketplace and open it from Page Builder. The Pages Context Panel auto-analyzes the current page; the Fullscreen Extension shows the site-wide view.

---

## API reference

### POST /api/analyze

Analyze a page's HTML and return an `AnalysisResult`.

Body:

    {
      "html": "<!doctype html>...",
      "pageId": "431cae67-1645-4d65-a57b-c794638f7108",
      "language": "en",
      "crawlerStatus": {
        "checked": true,
        "googleExtendedBlocked": false,
        "llmsTxtPresent": true
      },
      "policy": {
        "staleAfterMonths": 12,
        "minExternalLinks": 1,
        "minAttributions": 1
      },
      "now": "2026-09-22T10:00:00Z"
    }

All fields except `html` are optional.

Response: `AnalysisResult`

    {
      "mode": "scored",
      "score": 68,
      "categories": [ ... ],
      "findings": [ ... ],
      "diagnostics": [ ... ],
      "analyzedAt": "2026-09-22T10:00:00.000Z",
      "primaryEntity": "VitaFlow Energy Drink",
      "policy": { ... },
      "source": { ... }
    }

Limits:

- Max HTML size: 2 MB (`413` if exceeded)
- `html` is required (`400` if missing)
- Runtime: Node.js (not Edge)

### POST /api/crawler-check

Check a site's robots.txt and llms.txt state.

Body:

    { "siteUrl": "https://example.com" }

Response:

    {
      "checked": true,
      "googleExtendedBlocked": false,
      "llmsTxtPresent": true
    }

Rejects localhost, `.local`, and private IP ranges.

---

## Contributing

Contributions are welcome. Please:

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -am 'Add feature'`)
4. Push (`git push origin feature/your-feature`)
5. Open a Pull Request

For larger changes, open an issue first to discuss.

---

## License

MIT — see [LICENSE](./LICENSE).

---

## Built by

**BizTechnoSys** — Sitecore Gold Partner.

- Website: https://biztechnosys.com
- Marketplace: https://portal.sitecorecloud.io/marketplace/details?id=pub-35343dea-8835-4c7d-9f51-02ac96d4dc42
- Contact: hello@biztechnosys.com

---

## Acknowledgements

- [Sitecore Marketplace SDK](https://www.npmjs.com/package/@sitecore-marketplace-sdk/client)
- [schema.org](https://schema.org) — the vocabulary that makes structured data machine-readable
- [Open Graph Protocol](https://ogp.me) — the metadata standard for social and crawler consumption
- [llmstxt.org](https://llmstxt.org) — emerging convention for AI agent content discovery
