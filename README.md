# SitecoreAI Answer Readiness

A Sitecore Marketplace app that analyzes how ready your Sitecore content is for AI-powered discovery and answer generation.

The app provides two surfaces that share one deterministic analysis engine:

- **Pages Context Panel** — analyzes the page currently open in SitecoreAI Page Builder, directly in the authoring sidebar.
- **Fullscreen Extension** — browse every navigation page in a site, analyze any of them, and review a full answer-readiness report.

Both surfaces use the same scoring model, the same rules, and the same finding format. A page scores the same in both views.

---

## Table of Contents

- [What it does](#what-it-does)
- [Features](#features)
- [Architecture](#architecture)
- [Repository structure](#repository-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Local development](#local-development)
- [Marketplace installation](#marketplace-installation)
- [Analysis engine](#analysis-engine)
- [Scoring model](#scoring-model)
- [Security](#security)
- [Performance](#performance)
- [Testing](#testing)
- [Limitations](#limitations)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)
- [Attribution](#attribution)

---

## What it does

Marketers author content in SitecoreAI Page Builder and publish it to the web. Increasingly, that published content is read not by humans in a browser, but by AI answer engines — ChatGPT, Perplexity, Gemini, Google AI Overviews, and others.

Those engines do not read pages. They extract **short passages** and cite them as answers. A page that reads well for a human can still be invisible to AI if it lacks structure, direct answers, self-contained sections, concrete facts, or question-style headings.

This app analyzes a page for those signals and reports what to fix.

The score is a **content-readiness indicator**. It is not a search ranking score. It does not guarantee that any AI surface will cite the page.

---

## Features

### Analysis categories

| Category | Weight | What it measures |
|---|---|---|
| **Answer Structure** | 35 | Heading hierarchy, opening paragraphs, question-style headings, scannable blocks |
| **Passage Integrity** | 25 | Self-containment, pronoun density, context-dependent references |
| **Factual Density** | 20 | Numbers, dates, percentages, comparisons per 100 words |
| **Entity Clarity** | 10 | Definition-style language, title alignment, author signals, metadata hygiene |
| **FAQ Readiness** | 10 | Question-answer structure, FAQPage schema, matched Q&A pairing |

### Findings

Every finding carries:

- **Severity** — `error`, `warning`, `info`, or `pass`
- **Category** — which of the five buckets it belongs to
- **Title and description** — what was detected, why it matters
- **Recommendation** — what to do about it
- **Score impact** — how many points it costs
- **Samples** — concrete evidence from the page (headings, paragraphs, schema)
- **Suggestion** — a deterministic rewrite where one can be produced
- **Level** — `page`, `component`, or `unknown`, so the marketer knows where to fix

### Pages Context Panel

- Runs inside Page Builder, no context switching
- Auto-analyzes when the page changes
- Priority list of the top fixes
- Category accordion with dismissible findings
- Score trajectory vs previous analysis of the same page
- Export as summary, checklist, or full markdown report
- `R` keyboard shortcut to re-analyze

### Fullscreen Extension

- Tree view of every navigation page in the selected site and language
- Score dots per page, updated as pages are analyzed
- Full report per page: hero score, category grid, findings, passed checks
- Site average and per-page delta
- Batch analysis of every page in one click
- Prev/next navigation with `[` and `]` keyboard shortcuts
- Export per page or site-wide summary
- Multi-site and multi-language support

---

## Architecture

```
┌────────────────────────┐        ┌──────────────────────────┐
│  Pages Context Panel   │        │   Fullscreen Extension   │
│  (authoring sidebar)   │        │   (full page view)       │
└───────────┬────────────┘        └────────────┬─────────────┘
            │                                  │
            │  xmc.agent.pagesGetPageHtml      │
            │  (published HTML, by pageId)     │
            │                                  │
            ▼                                  ▼
      ┌─────────────────────────────────────────────────┐
      │        Shared deterministic analysis engine      │
      │                                                 │
      │   extractHtmlSignals → runRules → calculateResult│
      └───────────────────────────┬─────────────────────┘
                                  │
                                  ▼
                        ┌───────────────────┐
                        │  AnalysisResult   │
                        │  score + findings │
                        └───────────────────┘
```

### Key architectural decisions

**Deterministic first.** The score is produced by a rule engine, not by an LLM. The same HTML produces the same score every time. No variance, no hallucination, no network round-trip.

**Same engine, two surfaces.** Both extensions call the same `extractHtmlSignals`, `runRules`, and `calculateResult` functions. The only difference is how they retrieve the page HTML — and today both use the same source.

**Published HTML is the source of truth.** Both surfaces read the published HTML via the Agent API (`xmc.agent.pagesGetPageHtml`). This is the HTML that AI answer engines actually consume. It means the two surfaces agree exactly.

**No configuration.** The app has no environment variables, no per-customer configuration, and no secrets. It discovers sites, languages, and pages from the authenticated Marketplace SDK at runtime.

---

## Repository structure

```
sitecoreai-answer-readiness/
├── app/
│   ├── fullscreen/
│   │   └── page.tsx                     Fullscreen extension entry
│   ├── pages-contextpanel-extension/
│   │   └── page.tsx                     Context panel entry
│   ├── api/
│   │   └── analyze/
│   │       └── route.ts                 Server-side analysis endpoint
│   ├── layout.tsx
│   └── globals.css
│
├── src/
│   ├── components/
│   │   ├── AnswerReadinessPanel.tsx     Context panel root
│   │   ├── ScoreCard.tsx                Score ring and trajectory
│   │   ├── CategoryCard.tsx             Category findings
│   │   ├── DiagnosticCard.tsx           Insufficient-content state
│   │   ├── PriorityCard.tsx             Top fixes
│   │   ├── Banner.tsx                   Stale and error banners
│   │   ├── CopyButton.tsx               Export menu
│   │   ├── EmptyState.tsx               Waiting for Page Builder
│   │   ├── HelpModal.tsx                "What this measures"
│   │   └── site/
│   │       ├── SiteAnalysisView.tsx     Fullscreen root
│   │       ├── SitePageTree.tsx         Page tree
│   │       ├── SiteReportView.tsx       Report view
│   │       ├── SiteFindingCard.tsx      Per-finding card
│   │       ├── SiteWelcomePanel.tsx     Empty state
│   │       ├── SiteLoadingState.tsx
│   │       └── SiteErrorState.tsx
│   │
│   ├── lib/
│   │   └── analysis/
│   │       ├── html.ts                  HTML signal extraction
│   │       ├── rules.ts                 Rule engine
│   │       ├── score.ts                 Scoring aggregation
│   │       └── diff.ts                  Result comparison
│   │
│   ├── types/
│   │   ├── analysis.ts                  Core analysis types
│   │   └── site-analysis.ts             Fullscreen types
│   │
│   └── utils/
│       └── hooks/
│           └── useMarketplaceClient.ts  SDK initialization
│
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

---

## Prerequisites

- **Node.js 16 or later** — check with `node --version`
- **npm 10 or later** — check with `npm --version`
- A **SitecoreAI environment** with a Marketplace app configured in Sitecore Cloud Portal
- **SitecoreAI APIs** enabled for the app in App Studio → your app → API access
- Local DNS entry for `myapp.local` (see below)

---

## Installation

### 1. Clone and install

```bash
git clone <your-repo-url>
cd sitecoreai-answer-readiness
npm install
```

### 2. Configure local HTTPS

Page Builder only delivers context to iframes served over HTTPS. Update the dev script in `package.json`:

```json
"scripts": {
  "dev": "next dev --experimental-https --hostname myapp.local",
  "build": "next build",
  "start": "next start"
}
```

Add `myapp.local` to your hosts file:

**Windows** — open Notepad as Administrator, edit `C:\Windows\System32\drivers\etc\hosts`:
```
127.0.0.1 myapp.local
```

**macOS / Linux:**
```bash
sudo sh -c 'echo "127.0.0.1 myapp.local" >> /etc/hosts'
```

### 3. Configure the Marketplace app

In **Sitecore Cloud Portal → App Studio → your app**:

- **Deployment URL**: `https://myapp.local:3000`
- **API access**: enable **SitecoreAI APIs**
- **Extensions**:
  - **Pages Context Panel** → routing URL `/pages-contextpanel-extension`
  - **Fullscreen** → routing URL `/fullscreen`

### 4. Run

```bash
npm run dev
```

Accept the SSL certificate warning in your browser on the first load.

---

## Local development

### Open the app inside SitecoreAI, not directly

Opening `https://myapp.local:3000` directly in a browser tab will initialize the SDK but the host will never deliver page context. The extension must be loaded **by Page Builder**.

- **Context panel**: open a page in SitecoreAI Page Builder, then launch the app from the Apps menu in the toolbar.
- **Fullscreen**: launch it from the Apps menu in the top-right toolbar.

### Console logs

Runtime logs from the app appear in the **browser tab that has Page Builder loaded**, not in the terminal running `npm run dev`. Open DevTools on that tab and filter for `[AnswerReadiness]` to see app-level logs.

### Common development issues

| Symptom | Cause | Fix |
|---|---|---|
| "Waiting for Page Builder context..." forever | App opened outside Page Builder | Open from the Apps menu inside SitecoreAI |
| `pages.context` returns nothing | Extension point not enabled | Enable Pages Context Panel in Cloud Portal |
| HTTPS warning in console | Dev server running over HTTP | Use `--experimental-https --hostname myapp.local` |
| No pages found | Wrong site or language selected | Confirm site and language in the header |

---

## Marketplace installation

### For end users

1. Install the app from the Sitecore Marketplace.
2. The app appears under **Apps** in SitecoreAI.
3. Open the **Answer Readiness** context panel from any page in Page Builder.
4. Open the **Answer Readiness** fullscreen view from the Apps menu.

No configuration is required at install time. The app discovers sites, languages, and pages from the environment it is installed on.

### For app publishers

1. Register the app in Cloud Portal → App Studio.
2. Set the deployment URL to your production origin.
3. Enable **SitecoreAI APIs** in API access.
4. Configure both extension points: Pages Context Panel and Fullscreen.
5. Publish the app to the Marketplace.
6. Verify installation on a fresh environment.

---

## Analysis engine

The engine is a pure function pipeline. No network calls happen inside it.

```
HTML string
    │
    ▼
extractHtmlSignals(html) → HtmlSignals
    │
    ▼
runRules(signals) → AnalysisFinding[]
    │
    ▼
calculateResult(findings, signals, pageId, language) → AnalysisResult
```

### `extractHtmlSignals`

Parses rendered HTML with regex-based extractors. Produces:

- Headings with level and question detection
- First paragraph and all substantial paragraphs
- Title, meta description, canonical, OpenGraph
- JSON-LD blocks with FAQPage detection
- Lists, tables, links
- Factual markers (numbers, dates, comparisons)
- Pronoun-heavy sections
- Self-containment issues
- Localhost URLs, generic alt text
- Author signals (meta, schema, byline)
- Word count

### `runRules`

Runs five category evaluators. Each returns findings with severity, description, recommendation, score impact, samples, and suggestions.

| Category | Rules |
|---|---|
| Answer Structure | Opening paragraph, heading hierarchy, question headings, scannable blocks |
| Passage Integrity | Self-containment, pronoun density |
| Factual Density | Factual marker count and density |
| Entity Clarity | Definition, title, author signals, localhost URLs, generic alts |
| FAQ Readiness | FAQPage schema, FAQ content, consistency, opportunity detection |

### `calculateResult`

Aggregates findings into five category scores, sums them, and decides whether the result is `scored` or `diagnostic`.

If fewer than three categories have enough content to evaluate, the result is `diagnostic` — no score is shown, and the missing signals are listed instead.

---

## Scoring model

```
Content Structure       35
Passage Integrity       25
Factual Density         20
Entity Clarity          10
FAQ Readiness           10
                        ──
Total                  100
```

Every deducted point traces back to one or more findings. There is no hidden adjustment, no LLM smoothing, no per-customer calibration.

### Readiness tiers

| Score | Tier |
|---|---|
| 80–100 | Good readiness |
| 60–79 | Needs improvement |
| 35–59 | Significant gaps |
| 0–34 | Not answer-ready |

### Diagnostic mode

When a page has too little content to score, the app does not show a number. It shows a diagnostic card listing what is missing and how much content is present. This prevents the "empty page scores 77" problem that plagues naive analyzers.

---

## Security

- **No secrets in client code.** Authentication is handled by the Marketplace SDK. There are no API keys, OAuth secrets, or credentials in browser-accessible code.
- **Server-side analysis endpoint.** HTML analysis runs in `app/api/analyze/route.ts`. The client sends HTML, the server returns a structured result.
- **Request size limits.** The analyze route rejects HTML larger than 2 MB.
- **Input validation.** Every request is validated before processing.
- **No arbitrary URL fetching.** The app does not fetch user-provided URLs.
- **No configuration secrets.** The app has no environment variables and no per-installation secrets.

---

## Performance

- **HTML analysis is fast.** Signal extraction and rule evaluation run in under 50 ms for typical pages on the server.
- **Fullscreen batch analysis is serialized.** Pages are fetched and scored one at a time, so the app never hits the site with parallel requests.
- **Tree dots fill in as pages are analyzed.** No full re-analysis is required to see the site picture.
- **Analysis results are cached in memory per session.** Re-selecting a page uses the cached result unless the user clicks re-analyze.
- **Skeleton loaders replace spinners.** The fullscreen shows the shape of the report while it loads.

---

## Testing

### Unit tests

Test each rule in isolation. Provide a small HTML fixture, assert the returned findings match expectations.

Suggested cases:

1. Perfectly structured page — all categories pass
2. Missing metadata — title and description findings fire
3. Poor heading hierarchy — jump detection fires
4. Missing entity definition — entity-clarity warning fires
5. Missing structured data — schema finding fires
6. Incomplete answer content — factual density finding fires
7. FAQ content without schema — FAQ finding fires
8. Empty page — diagnostic mode returned
9. Invalid HTML — extractor still returns signals
10. Oversized HTML — the API rejects with 413

### Integration tests

- Full pipeline from HTML to `AnalysisResult`
- Context panel HTML retrieval via Agent API
- Fullscreen tree construction from flat page list
- Multi-site filtering
- Multi-language switching

### Manual verification

1. Open a page in Page Builder. Confirm the context panel scores it.
2. Open the fullscreen extension. Confirm the same page scores identically.
3. Change the language. Confirm the tree reloads.
4. Click **Analyze all** in the fullscreen. Confirm every dot fills in.
5. Export a report. Confirm the markdown contains every finding.

---

## Limitations

- **Published HTML only.** Both surfaces analyze the published version of the page. Unsaved edits in Page Builder are not reflected until the page is published.
- **Single-page score, single-site scope.** The score applies to one page. The fullscreen reports on one site at a time.
- **No crawler access checks.** The app does not inspect `robots.txt`, `Google-Extended` crawler access, or sitemap configuration.
- **No cross-source authority.** The app does not verify claims against external sources, Wikidata, or manufacturer documentation.
- **No AI-generated analysis.** The score is deterministic. The app does not use an LLM to interpret page content.
- **The score is not a ranking score.** It measures on-page content readiness for AI extraction. It does not guarantee citation in any AI surface.

---

## Roadmap

### V1 — Shipped

- Deterministic AEO/GEO engine
- Pages Context Panel
- Fullscreen extension with tree and report views
- Multi-site and multi-language support
- Export per page and per site

### V1.1 — Planned

- Author attribution and E-E-A-T signals
- Content freshness metadata detection
- FAQPage schema property validation

### V1.2 — Planned

- LLM-assisted rewrite suggestions where the model is available
- Site-wide comparison and trend tracking

### V2 — Proposed

- Brand terminology and claims validation
- Regulatory disclosure checks
- Content governance rules per organization

---

## Contributing

This is a Marketplace reference implementation. Contributions that improve rule accuracy, UI clarity, or extensibility are welcome.

Before opening a pull request:

1. Run `npx tsc --noEmit`. There should be no type errors.
2. Run `npm run build`. There should be no build errors.
3. Test both extensions inside Page Builder.
4. Add a note to this README if you add or change a rule.
5. Keep findings deterministic. If a rule depends on an LLM, it does not belong in the scoring engine.

---

## License

MIT. See `LICENSE` for details.

---

## Attribution

Built with:

- `@sitecore-marketplace-sdk/client`
- `@sitecore-marketplace-sdk/xmc`
- Next.js 15 App Router
- Tailwind CSS v4
- React 19

---

## Support

For issues with this app, open an issue on the repository.
