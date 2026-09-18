# SitecoreAI Answer Readiness

A production-oriented Sitecore Marketplace Pages Context Panel for analyzing how ready a SitecoreAI page is for AI-powered discovery and answer generation.

## What it does

The V1 implementation provides deterministic analysis for:

- Content structure
- Heading hierarchy
- Entity-definition signals
- Page title
- Meta description
- OpenGraph metadata
- Canonical metadata
- JSON-LD
- Rendered text volume
- Basic answer-readiness signals

The score is transparent and explainable. It is an internal content-readiness indicator, not a ranking score for Google, ChatGPT, Perplexity, Gemini, or any other engine.

## Marketplace integration

The app uses the official Marketplace SDK packages:

- `@sitecore-marketplace-sdk/client`
- `@sitecore-marketplace-sdk/xmc`
- `@sitecore-marketplace-sdk/ai`

The Page Builder extension uses `pages.context` to track the active page. The current SitecoreAI Marketplace SDK also provides supported rendered-page HTML retrieval through `getPageHTML()`; the app isolates that call so SDK-version differences do not leak into the analyzer.

Sitecore's current Marketplace documentation identifies Pages Context Panel as the Page Builder extension point for page-contextual tools such as SEO helpers. The SDK's `pages.context` query is subscribable and exposes `pageInfo`.

## Architecture

```text
SitecoreAI Page Builder
        |
        v
Pages Context Panel
        |
        +--> pages.context
        |
        +--> getPageHTML()
        |
        v
Next.js analysis endpoint
        |
        +--> HTML signal extraction
        +--> deterministic rules
        +--> scoring
        |
        v
Answer Readiness UI
```

## Score model

| Category | Weight |
|---|---:|
| Content Structure | 20 |
| Entity Clarity | 20 |
| Metadata & Discoverability | 20 |
| Structured Data | 20 |
| Answer Readiness | 20 |
| **Total** | **100** |

Every deduction is attached to a finding.

## AI extension point

`src/lib/ai/brand-review.ts` contains an optional integration boundary for the SitecoreAI Brand Review API through the Marketplace client.

The deterministic analyzer does not depend on an LLM. This is intentional:

1. deterministic checks remain reproducible;
2. AI can enrich semantic findings later;
3. AI outages do not break the core analyzer.

## Local setup

```bash
npm install
npm run dev
```

Configure the application in Sitecore Developer Studio as a Custom App with the **Pages Context Panel** extension point and a route of:

```text
/pages-contextpanel-extension
```

For local development, configure the Marketplace app deployment URL to your local application as described by the Sitecore Marketplace documentation.

## Important SDK note

The repository intentionally uses the latest SDK package tags instead of pinning an old Marketplace SDK release.

Before production deployment:

```bash
npm install
npm run build
```

If the installed SDK exposes a changed signature for rendered HTML retrieval, update the isolated adapter in:

```text
src/components/AnswerReadinessPanel.tsx
```

Do not modify the rule engine to accommodate SDK transport details.

## Security

No Sitecore credentials or external LLM credentials are stored in the browser.

The deterministic analyzer accepts only the rendered HTML sent by the Marketplace client. A size limit is enforced on the server endpoint.

If an external LLM is added in a future version, its credentials must remain server-side.

## Current limitations

- V1 does not claim to validate every search-engine-specific requirement.
- Entity clarity is currently based on deterministic signals; semantic entity extraction can be added through an AI adapter.
- Structured-data validation checks presence and JSON parsing, not full schema.org conformance.
- The app does not guarantee AI-search visibility or ranking.
- Navigation directly from a finding to a specific Page Builder field/component requires additional host-supported mutation/navigation APIs and is intentionally not faked.

## Roadmap

### V1
- Answer Readiness
- AEO/GEO rules
- Transparent scoring

### V1.1
- Semantic AI analysis
- Better entity extraction
- AI-generated explanations

### V1.2
- Field/component-aware recommendations
- Authoring shortcuts

### V2
- Brand terminology
- Claims review
- Disclosure checks
- Governance rules

### V3
- Agentic workflows
- Marketer MCP integration

## License

MIT
