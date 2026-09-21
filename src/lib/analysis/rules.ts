import type {
  AnalysisFinding,
  AnalysisCategory,
  AnalysisPolicy,
  CrawlerStatus,
  CategoryResult,
  CategoryStatus,
} from "@/src/types/analysis";
import { DEFAULT_ANALYSIS_POLICY } from "@/src/types/analysis";
import type { HtmlSignals } from "./html";
import {
  headingSamples,
  paragraphSamples,
  jsonLdSamples,
  titleSample,
  linkSamples,
  dateSample,
} from "./samples";
import { extractPrimaryEntity, suggestHeadingRewrite } from "./suggestions";

const MIN_PARAGRAPHS_FOR_PASSAGE = 3;
const MIN_WORDS_FOR_DENSITY = 100;
const MIN_FACTUAL_MARKERS = 3;
const MIN_HEADING_QUESTION_RATIO = 0.3;

interface CategorySpec {
  category: AnalysisCategory;
  label: string;
  maxScore: number;
}

const CATEGORY_SPECS: CategorySpec[] = [
  { category: "answer-structure", label: "Answer Structure", maxScore: 30 },
  { category: "passage-integrity", label: "Passage Integrity", maxScore: 22 },
  { category: "factual-density", label: "Factual Density", maxScore: 17 },
  { category: "entity-clarity", label: "Entity Clarity", maxScore: 9 },
  { category: "faq-readiness", label: "FAQ Readiness", maxScore: 8 },
  { category: "freshness", label: "Freshness", maxScore: 8 },
  { category: "citation", label: "Citation Signals", maxScore: 6 },
];

function makeFinding(
  partial: Omit<AnalysisFinding, "automated">
): AnalysisFinding {
  return { ...partial, automated: true };
}

// ─── ANSWER STRUCTURE (max 30) ────────────────────────────
function evaluateAnswerStructure(
  signals: HtmlSignals,
  entity: string | null
): { findings: AnalysisFinding[]; missing: string[]; score: number } {
  const findings: AnalysisFinding[] = [];
  const missing: string[] = [];
  let score = 30;

  const h1s = signals.headings.filter((h) => h.level === 1);
  const h2s = signals.headings.filter((h) => h.level === 2);
  const hasStructuralHeading = h1s.length > 0 || h2s.length > 0;

  if (!hasStructuralHeading) {
    score -= 9;
    missing.push("No page or section heading (H1/H2)");
    findings.push(
      makeFinding({
        id: "as-no-headings",
        category: "answer-structure",
        severity: "error",
        title: "No page-level or section headings",
        description:
          "The rendered page contains no H1 or H2 headings. AI systems need a structural heading to anchor the page topic.",
        recommendation:
          "Add a single H1 that names the page topic, and use H2 for each major section.",
        scoreImpact: 9,
        level: "page",
        source: "html-standard",
        samples: headingSamples(signals),
      })
    );
  } else if (h1s.length === 0) {
    score -= 4;
    missing.push("No H1 heading");
    findings.push(
      makeFinding({
        id: "as-no-h1",
        category: "answer-structure",
        severity: "warning",
        title: "No H1 heading detected",
        description: "Section headings exist but the page has no primary H1.",
        recommendation: "Add one H1 that names the page topic.",
        scoreImpact: 4,
        level: "page",
        source: "html-standard",
        samples: h2s.slice(0, 3).map((h, i) => ({
          kind: "heading",
          value: `H${h.level}: ${h.text}`,
          position: i + 1,
        })),
      })
    );
  }

  const firstParaWords = signals.firstParagraph
    .split(/\s+/)
    .filter(Boolean).length;

  if (!signals.firstParagraph) {
    score -= 9;
    missing.push("No opening answer paragraph");
    findings.push(
      makeFinding({
        id: "as-no-opening",
        category: "answer-structure",
        severity: "error",
        title: "No opening answer paragraph",
        description:
          "The page has no paragraph that could be extracted as a direct answer.",
        recommendation:
          "Add a 40–80 word opening paragraph that answers the primary question directly.",
        scoreImpact: 9,
        level: "page",
        source: "heuristic",
        suggestion: entity
          ? {
              from: "(no opening paragraph)",
              to: `${entity} is ...`,
              rationale:
                "Start with a definition to make the page answer-extractable.",
            }
          : undefined,
      })
    );
  } else if (firstParaWords < 20) {
    score -= 5;
    missing.push("Opening paragraph is too short to be an answer");
    findings.push(
      makeFinding({
        id: "as-opening-short",
        category: "answer-structure",
        severity: "warning",
        title: "Opening paragraph is too short",
        description: `The opening paragraph contains only about ${firstParaWords} words.`,
        recommendation:
          "Expand the opening to 40–80 words so AI systems can extract a self-contained answer.",
        scoreImpact: 5,
        level: "page",
        source: "heuristic",
        evidence: {
          source: "first-paragraph",
          value: signals.firstParagraph.slice(0, 160),
        },
        samples: paragraphSamples(signals, 1),
      })
    );
  } else if (firstParaWords > 120) {
    score -= 3;
    missing.push(
      "Opening paragraph is too long to be extracted as a single answer"
    );
    findings.push(
      makeFinding({
        id: "as-opening-long",
        category: "answer-structure",
        severity: "warning",
        title: "Opening paragraph is too long",
        description: `The opening paragraph contains about ${firstParaWords} words.`,
        recommendation:
          "Split the opening into a short answer-first sentence (under 60 words) followed by supporting detail.",
        scoreImpact: 3,
        level: "page",
        source: "heuristic",
        evidence: {
          source: "first-paragraph",
          value: signals.firstParagraph.slice(0, 160),
        },
        samples: paragraphSamples(signals, 1),
      })
    );
  } else {
    findings.push(
      makeFinding({
        id: "as-opening-ok",
        category: "answer-structure",
        severity: "pass",
        title: "Answer-first opening paragraph detected",
        description: `The page opens with about ${firstParaWords} words.`,
        recommendation: "Keep the opening answer-focused.",
        scoreImpact: 0,
        level: "page",
        source: "heuristic",
      })
    );
  }

  const totalHeadings = signals.headings.length;
  const questionRatio =
    totalHeadings > 0 ? signals.questionHeadings / totalHeadings : 0;

  if (totalHeadings > 0 && questionRatio < MIN_HEADING_QUESTION_RATIO) {
    const deduction = signals.questionHeadings === 0 ? 7 : 3;
    score -= deduction;

    const nonQuestions = signals.headings.filter((h) => !h.isQuestion);
    const firstNonQuestion = nonQuestions[0];

    missing.push("Question-style headings are missing or too few");
    findings.push(
      makeFinding({
        id: "as-no-question-headings",
        category: "answer-structure",
        severity: signals.questionHeadings === 0 ? "warning" : "info",
        title:
          signals.questionHeadings === 0
            ? "No question-style headings detected"
            : "Few question-style headings",
        description: `Only ${signals.questionHeadings} of ${totalHeadings} headings are phrased as questions.`,
        recommendation:
          "Rewrite key section headings as the questions users ask. AI systems align queries to question headings.",
        scoreImpact: deduction,
        level: "component",
        source: "heuristic",
        evidence: { source: "headings", count: totalHeadings },
        samples: headingSamples(signals, true),
        suggestion: firstNonQuestion
          ? suggestHeadingRewrite(firstNonQuestion.text, entity) ?? undefined
          : undefined,
      })
    );
  } else if (totalHeadings > 0) {
    findings.push(
      makeFinding({
        id: "as-question-headings-ok",
        category: "answer-structure",
        severity: "pass",
        title: "Question-style headings detected",
        description: `${signals.questionHeadings} of ${totalHeadings} headings are phrased as questions.`,
        recommendation:
          "Keep question headings aligned with real user queries.",
        scoreImpact: 0,
        level: "component",
        source: "heuristic",
      })
    );
  }

  const scannable = signals.lists + signals.tables;

  if (scannable === 0 && totalHeadings >= 3) {
    score -= 3;
    missing.push("No lists or tables for scannable extraction");
    findings.push(
      makeFinding({
        id: "as-no-scannable",
        category: "answer-structure",
        severity: "info",
        title: "No lists or tables detected",
        description:
          "Long pages without lists or tables are harder for AI systems to scan.",
        recommendation:
          "Use lists or tables where the content naturally fits a structured format.",
        scoreImpact: 3,
        level: "component",
        source: "html-standard",
      })
    );
  } else if (scannable > 0) {
    findings.push(
      makeFinding({
        id: "as-scannable-ok",
        category: "answer-structure",
        severity: "pass",
        title: "Scannable content structure detected",
        description: `Detected ${signals.lists} list(s) and ${signals.tables} table(s).`,
        recommendation: "Continue using lists and tables for structured claims.",
        scoreImpact: 0,
        level: "component",
        source: "html-standard",
      })
    );
  }

  return { findings, missing, score: Math.max(0, score) };
}

// ─── PASSAGE INTEGRITY (max 22) ───────────────────────────
function evaluatePassageIntegrity(signals: HtmlSignals): {
  findings: AnalysisFinding[];
  missing: string[];
  score: number;
  status: CategoryStatus;
} {
  const findings: AnalysisFinding[] = [];
  const missing: string[] = [];

  if (signals.paragraphs.length < MIN_PARAGRAPHS_FOR_PASSAGE) {
    missing.push(
      `Only ${signals.paragraphs.length} paragraph(s) of substance detected — need at least ${MIN_PARAGRAPHS_FOR_PASSAGE}`
    );
    findings.push(
      makeFinding({
        id: "pi-insufficient",
        category: "passage-integrity",
        severity: "info",
        title: "Insufficient content to evaluate passage integrity",
        description: `Only ${signals.paragraphs.length} substantial paragraph(s) detected.`,
        recommendation:
          "Add more prose content so passages can be evaluated for self-containment.",
        scoreImpact: 22,
        level: "page",
        source: "heuristic",
        samples: paragraphSamples(signals, 2),
      })
    );
    return { findings, missing, score: 0, status: "insufficient-content" };
  }

  let score = 22;

  if (signals.selfContainedIssues > 0) {
    score -= 7;
    missing.push("Passages contain backward or forward references");
    findings.push(
      makeFinding({
        id: "pi-self-containment",
        category: "passage-integrity",
        severity: "warning",
        title: "Passages depend on surrounding context",
        description: `Detected ${signals.selfContainedIssues} context-dependent reference(s).`,
        recommendation:
          "Make each section self-contained. AI systems extract passages in isolation.",
        scoreImpact: 7,
        level: "component",
        source: "heuristic",
        evidence: {
          source: "rendered-html",
          count: signals.selfContainedIssues,
        },
      })
    );
  } else {
    findings.push(
      makeFinding({
        id: "pi-self-containment-ok",
        category: "passage-integrity",
        severity: "pass",
        title: "Passages are self-contained",
        description: "No backward or forward references detected.",
        recommendation: "Keep each passage self-contained.",
        scoreImpact: 0,
        level: "component",
        source: "heuristic",
      })
    );
  }

  const heavyRatio = signals.pronounHeavySections / signals.paragraphs.length;

  if (heavyRatio > 0.3) {
    score -= 9;
    missing.push("High pronoun density in most paragraphs");
    findings.push(
      makeFinding({
        id: "pi-pronoun-high",
        category: "passage-integrity",
        severity: "warning",
        title: "High pronoun density in sections",
        description: `${signals.pronounHeavySections} of ${signals.paragraphs.length} paragraphs rely heavily on pronouns.`,
        recommendation:
          "Replace ambiguous pronouns with the actual entity name so passages make sense out of context.",
        scoreImpact: 9,
        level: "component",
        source: "heuristic",
        samples: paragraphSamples(signals, 3),
      })
    );
  } else if (heavyRatio > 0) {
    score -= 4;
    missing.push("Some paragraphs rely on pronouns");
    findings.push(
      makeFinding({
        id: "pi-pronoun-some",
        category: "passage-integrity",
        severity: "info",
        title: "Some paragraphs rely on pronouns",
        description: `${signals.pronounHeavySections} paragraph(s) show elevated pronoun density.`,
        recommendation: "Review those paragraphs for self-containment.",
        scoreImpact: 4,
        level: "component",
        source: "heuristic",
      })
    );
  } else {
    findings.push(
      makeFinding({
        id: "pi-pronoun-ok",
        category: "passage-integrity",
        severity: "pass",
        title: "Pronoun density is acceptable",
        description: "Paragraphs do not depend on pronouns for meaning.",
        recommendation: "Maintain explicit entity references.",
        scoreImpact: 0,
        level: "component",
        source: "heuristic",
      })
    );
  }

  return {
    findings,
    missing,
    score: Math.max(0, score),
    status: "evaluated",
  };
}

// ─── FACTUAL DENSITY (max 17) ─────────────────────────────
function evaluateFactualDensity(signals: HtmlSignals): {
  findings: AnalysisFinding[];
  missing: string[];
  score: number;
  status: CategoryStatus;
} {
  const findings: AnalysisFinding[] = [];
  const missing: string[] = [];

  if (signals.wordCount < MIN_WORDS_FOR_DENSITY) {
    missing.push(
      `Only ${signals.wordCount} words — need at least ${MIN_WORDS_FOR_DENSITY}`
    );
    findings.push(
      makeFinding({
        id: "fd-insufficient",
        category: "factual-density",
        severity: "info",
        title: "Insufficient prose to evaluate factual density",
        description: `Only about ${signals.wordCount} words of prose detected.`,
        recommendation:
          "Add substantive prose. AI systems need concrete claims to quote.",
        scoreImpact: 17,
        level: "page",
        source: "heuristic",
      })
    );
    return { findings, missing, score: 0, status: "insufficient-content" };
  }

  let score = 17;
  const density = (signals.factualMarkers / signals.wordCount) * 100;

  if (signals.factualMarkers < MIN_FACTUAL_MARKERS) {
    score -= 10;
    missing.push(
      `Only ${signals.factualMarkers} factual marker(s) — need at least ${MIN_FACTUAL_MARKERS}`
    );
    findings.push(
      makeFinding({
        id: "fd-too-few",
        category: "factual-density",
        severity: "warning",
        title: "Too few factual markers",
        description: `Detected ${signals.factualMarkers} factual marker(s) across ${signals.wordCount} words.`,
        recommendation:
          "Add specific numbers with units, dates, or comparisons. AI systems preferentially quote concrete claims.",
        scoreImpact: 10,
        level: "component",
        source: "heuristic",
        evidence: { source: "rendered-html", count: signals.factualMarkers },
        samples: paragraphSamples(signals, 3),
      })
    );
  } else if (density < 0.5) {
    score -= 5;
    missing.push("Low factual density");
    findings.push(
      makeFinding({
        id: "fd-low",
        category: "factual-density",
        severity: "info",
        title: "Low factual density",
        description: `Detected ${signals.factualMarkers} factual marker(s) across ${signals.wordCount} words.`,
        recommendation:
          "Add more concrete facts so AI systems have quotable material.",
        scoreImpact: 5,
        level: "component",
        source: "heuristic",
        evidence: { source: "rendered-html", count: signals.factualMarkers },
        samples: paragraphSamples(signals, 2),
      })
    );
  } else {
    findings.push(
      makeFinding({
        id: "fd-ok",
        category: "factual-density",
        severity: "pass",
        title: "Good factual density",
        description: `Detected ${signals.factualMarkers} factual marker(s) across ${signals.wordCount} words.`,
        recommendation: "Continue using specific, verifiable claims.",
        scoreImpact: 0,
        level: "component",
        source: "heuristic",
      })
    );
  }

  return {
    findings,
    missing,
    score: Math.max(0, score),
    status: "evaluated",
  };
}

// ─── ENTITY CLARITY (max 9) ───────────────────────────────
function evaluateEntityClarity(
  signals: HtmlSignals,
  entity: string | null
): { findings: AnalysisFinding[]; missing: string[]; score: number } {
  const findings: AnalysisFinding[] = [];
  const missing: string[] = [];
  let score = 9;

  if (!signals.title) {
    score -= 3;
    missing.push("No page title element");
    findings.push(
      makeFinding({
        id: "ec-title-missing",
        category: "entity-clarity",
        severity: "warning",
        title: "Page title is missing",
        description: "No title element was detected in the rendered page.",
        recommendation:
          "Provide a title that names the primary entity and mirrors the query.",
        scoreImpact: 3,
        level: "page",
        source: "html-standard",
      })
    );
  } else {
    findings.push(
      makeFinding({
        id: "ec-title-ok",
        category: "entity-clarity",
        severity: "pass",
        title: "Page title detected",
        description: "A title element names the page topic.",
        recommendation: "Keep the title specific and query-aligned.",
        scoreImpact: 0,
        level: "page",
        source: "html-standard",
        evidence: { source: "title", value: signals.title },
        samples: titleSample(signals) ? [titleSample(signals)!] : undefined,
      })
    );
  }

  const definitionPatterns = /\b(is|are|refers to|defined as|means|known as)\b/i;
  const openingText = signals.text.slice(0, 800);

  if (!definitionPatterns.test(openingText)) {
    score -= 3;
    missing.push("No definition-style language near the top of the page");
    findings.push(
      makeFinding({
        id: "ec-definition-missing",
        category: "entity-clarity",
        severity: "warning",
        title: "Primary entity is not explicitly defined",
        description:
          "No definition-style language was detected in the opening content.",
        recommendation:
          'Add a concise, self-contained definition near the top (e.g., "X is Y").',
        scoreImpact: 3,
        level: "page",
        source: "heuristic",
        suggestion: entity
          ? {
              from: "(no definition)",
              to: `${entity} is ...`,
              rationale:
                "Definition-first structure is the strongest entity signal.",
            }
          : undefined,
      })
    );
  } else {
    findings.push(
      makeFinding({
        id: "ec-definition-ok",
        category: "entity-clarity",
        severity: "pass",
        title: "Definition-style language detected",
        description: "The opening content contains definition-style language.",
        recommendation: "Keep the definition concise and self-contained.",
        scoreImpact: 0,
        level: "page",
        source: "heuristic",
      })
    );
  }

  const hasAuthor =
    signals.hasAuthorMeta ||
    signals.hasAuthorSchema ||
    signals.hasVisibleByline;

  if (!hasAuthor) {
    score -= 2;
    missing.push("No author attribution (meta, schema, or byline)");
    findings.push(
      makeFinding({
        id: "ec-author-missing",
        category: "entity-clarity",
        severity: "info",
        title: "No author attribution detected",
        description:
          "No author meta, Person schema, or visible byline was found.",
        recommendation:
          "Add author attribution for editorial content. AI systems favor content with clear provenance.",
        scoreImpact: 2,
        level: "page",
        source: "schema-org",
      })
    );
  } else {
    findings.push(
      makeFinding({
        id: "ec-author-ok",
        category: "entity-clarity",
        severity: "pass",
        title: "Author attribution detected",
        description: signals.authorName
          ? `Author identified as "${signals.authorName}".`
          : "Author signals present.",
        recommendation:
          "Keep author signals consistent across meta, schema, and byline.",
        scoreImpact: 0,
        level: "page",
        source: "schema-org",
      })
    );
  }

  if (signals.hasLocalhostUrls) {
    score -= 1;
    missing.push("Metadata contains localhost URLs");
    findings.push(
      makeFinding({
        id: "ec-localhost",
        category: "entity-clarity",
        severity: "warning",
        title: "Localhost URLs detected in page metadata",
        description:
          "Canonical, OpenGraph, or JSON-LD URLs point to a localhost address.",
        recommendation:
          "Replace all localhost references with production HTTPS URLs.",
        scoreImpact: 1,
        level: "page",
        source: "heuristic",
      })
    );
  }

  if (signals.genericAltTexts > 0) {
    score -= 1;
    missing.push("Generic image alt text detected");
    findings.push(
      makeFinding({
        id: "ec-generic-alt",
        category: "entity-clarity",
        severity: "info",
        title: "Generic image alt text detected",
        description: `Found ${signals.genericAltTexts} image(s) with placeholder alt text.`,
        recommendation:
          "Replace generic alt text with descriptive, entity-specific descriptions.",
        scoreImpact: 1,
        level: "component",
        source: "html-standard",
        evidence: { source: "rendered-html", count: signals.genericAltTexts },
      })
    );
  }

  return { findings, missing, score: Math.max(0, score) };
}

// ─── FAQ READINESS (max 8) ────────────────────────────────
function evaluateFaqReadiness(
  signals: HtmlSignals,
  crawlerStatus?: CrawlerStatus
): {
  findings: AnalysisFinding[];
  missing: string[];
  score: number;
  status: CategoryStatus;
} {
  const findings: AnalysisFinding[] = [];
  const missing: string[] = [];

  const hasFaqSchema = signals.hasFaqSchema;
  const schemaQuestions = signals.faqSchemaQuestions;
  const visibleQuestions = signals.visibleFaqQuestions;

  const matched = signals.faqMatchedQuestions.length;
  const total = schemaQuestions.length;
  const unverified = total - matched;

  const hasSchemaSurface = hasFaqSchema;
  const hasVisibleSurface = visibleQuestions.length >= 2;
  const hasAnySurface = hasSchemaSurface || hasVisibleSurface;

  if (!hasAnySurface) {
    missing.push(
      "No FAQPage structured data and no question-shaped content in the rendered page"
    );
    findings.push(
      makeFinding({
        id: "fr-no-surface",
        category: "faq-readiness",
        severity: "warning",
        title: "No FAQ or Q&A structure detected",
        description:
          "No FAQPage JSON-LD was found, and no question-shaped content (headings, summaries, accordion items) was detected in the rendered page.",
        recommendation:
          'Add a FAQ section with 3–5 questions users are likely to ask, and pair it with FAQPage JSON-LD whose "name" fields match the visible questions verbatim. Example JSON-LD: { "@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{ "@type": "Question", "name": "What is the warranty period?", "acceptedAnswer": { "@type": "Answer", "text": "..." } }] }.',
        scoreImpact: 8,
        level: "component",
        source: "schema-org",
      })
    );
    return { findings, missing, score: 0, status: "insufficient-content" };
  }

  let score = 8;

  if (hasSchemaSurface && matched >= 2 && unverified === 0) {
    findings.push(
      makeFinding({
        id: "fr-schema-content-ok",
        category: "faq-readiness",
        severity: "pass",
        title: "FAQPage schema matches visible FAQ content",
        description: `Verified ${matched} of ${total} FAQPage question(s) in the page text.`,
        recommendation: "Keep schema synchronized with visible content.",
        scoreImpact: 0,
        level: "component",
        source: "schema-org",
        samples: jsonLdSamples(signals),
      })
    );
  } else if (hasSchemaSurface && matched < 2) {
    score -= 5;
    missing.push(
      `FAQPage schema present but questions not found in visible content (${matched}/${total} verified)`
    );
    findings.push(
      makeFinding({
        id: "fr-schema-mismatch",
        category: "faq-readiness",
        severity: "warning",
        title: "FAQPage schema does not match visible content",
        description: `FAQPage declares ${total} question(s), but only ${matched} were found verbatim in the rendered text.`,
        recommendation:
          "Either add the questions to the visible page, or remove the schema. Mismatched schema is a Google Rich Results violation risk.",
        scoreImpact: 5,
        level: "component",
        source: "schema-org",
        samples: jsonLdSamples(signals),
      })
    );
  } else if (hasSchemaSurface && unverified > 0) {
    score -= 2;
    missing.push(
      `${unverified} FAQPage question(s) not found in visible content`
    );
    findings.push(
      makeFinding({
        id: "fr-schema-partial",
        category: "faq-readiness",
        severity: "info",
        title: "Some FAQPage questions not found in visible content",
        description: `${matched} of ${total} FAQPage question(s) were verified in the page text; ${unverified} were not.`,
        recommendation:
          "Ensure every question in FAQPage JSON-LD appears verbatim in the rendered page.",
        scoreImpact: 2,
        level: "component",
        source: "schema-org",
      })
    );
  } else if (!hasSchemaSurface && hasVisibleSurface) {
    score -= 3;
    missing.push("Visible FAQ content without FAQPage schema");
    findings.push(
      makeFinding({
        id: "fr-content-no-schema",
        category: "faq-readiness",
        severity: "info",
        title: "FAQ content without FAQPage schema",
        description: `Detected ${visibleQuestions.length} question-shaped string(s) in the rendered page, but no FAQPage JSON-LD was found.`,
        recommendation:
          "Add FAQPage JSON-LD whose questions match the visible FAQ content. It is the structured data type most consistently correlated with AI citation.",
        scoreImpact: 3,
        level: "component",
        source: "schema-org",
      })
    );
  }

  if (crawlerStatus?.checked && crawlerStatus.googleExtendedBlocked) {
    findings.push(
      makeFinding({
        id: "fr-google-extended-blocked",
        category: "faq-readiness",
        severity: "info",
        title: "Google-Extended is blocked in robots.txt",
        description:
          "Google-Extended disallow prevents Gemini grounding and training use but does not affect Google Search or AI Overviews.",
        recommendation:
          "If you want content cited in the Gemini app or Vertex AI, unblock Google-Extended.",
        scoreImpact: 0,
        level: "page",
        source: "robots-exclusion",
      })
    );
  }

  if (crawlerStatus?.checked && !crawlerStatus.llmsTxtPresent) {
    findings.push(
      makeFinding({
        id: "fr-llms-txt-absent",
        category: "faq-readiness",
        severity: "info",
        title: "No llms.txt file detected",
        description:
          "An llms.txt file was not found at the site root. This is an emerging convention for AI agent content discovery.",
        recommendation:
          "Consider adding an llms.txt file to provide AI assistants with a curated content map.",
        scoreImpact: 0,
        level: "page",
        source: "llms-txt",
      })
    );
  }

  return {
    findings,
    missing,
    score: Math.max(0, score),
    status: "evaluated",
  };
}

// ─── FRESHNESS (max 8) ────────────────────────────────────
function evaluateFreshness(
  signals: HtmlSignals,
  policy: AnalysisPolicy,
  now: Date
): {
  findings: AnalysisFinding[];
  missing: string[];
  score: number;
  status: CategoryStatus;
} {
  const findings: AnalysisFinding[] = [];
  const missing: string[] = [];
  let score = 8;

  if (!signals.dateModified) {
    score -= 8;
    missing.push("No dateModified or article:modified_time signal");
    findings.push(
      makeFinding({
        id: "fh-no-date",
        category: "freshness",
        severity: "warning",
        title: "No last-modified date exposed",
        description:
          "The page does not publish a dateModified, article:modified_time, or equivalent freshness signal.",
        recommendation:
          'Add a machine-readable last-modified date to your page template. The simplest option is: <meta property="article:modified_time" content="2026-09-21T10:00:00Z">. For richer structured data, add a JSON-LD WebPage or Article node with a "dateModified" field in ISO 8601 format. Example: { "@context": "https://schema.org", "@type": "WebPage", "dateModified": "2026-09-21T10:00:00Z" }.',
        scoreImpact: 8,
        level: "page",
        source: "open-graph",
      })
    );
    return { findings, missing, score: 0, status: "evaluated" };
  }

  if (!signals.dateModifiedIso) {
    score -= 4;
    missing.push(
      `dateModified value "${signals.dateModified}" is not parseable`
    );
    findings.push(
      makeFinding({
        id: "fh-invalid-date",
        category: "freshness",
        severity: "warning",
        title: "Last-modified date is not parseable",
        description: `A date was found (${
          signals.dateModifiedSource ?? "unknown source"
        }) but its value "${signals.dateModified}" is not a valid ISO 8601 date.`,
        recommendation:
          'Use ISO 8601 format: YYYY-MM-DDTHH:MM:SSZ. Example: "2026-09-21T10:00:00Z". Avoid formats like "21 Sep 2026" or "09/21/2026" — parsers and AI crawlers expect ISO 8601 in machine-readable metadata.',
        scoreImpact: 4,
        level: "page",
        source: "open-graph",
        samples: dateSample(signals),
      })
    );
    return {
      findings,
      missing,
      score: Math.max(0, score),
      status: "evaluated",
    };
  }

  const modified = new Date(signals.dateModifiedIso).getTime();
  const ageDays = Math.floor(
    (now.getTime() - modified) / (1000 * 60 * 60 * 24)
  );
  const ageMonths = ageDays / 30.44;

  if (ageMonths > policy.staleAfterMonths) {
    score -= 5;
    missing.push(`Content last modified ~${Math.round(ageMonths)} months ago`);
    findings.push(
      makeFinding({
        id: "fh-stale",
        category: "freshness",
        severity: "warning",
        title: "Content may be considered stale",
        description: `The page was last modified about ${Math.round(
          ageMonths
        )} months ago (${ageDays} days). Threshold applied: ${
          policy.staleAfterMonths
        } months.`,
        recommendation:
          "Review and refresh the page content, then update the dateModified signal in the template or JSON-LD. Keep the date current with meaningful edits — AI engines weight recency when selecting sources.",
        scoreImpact: 5,
        level: "page",
        source: "heuristic",
        samples: dateSample(signals),
      })
    );
  } else {
    findings.push(
      makeFinding({
        id: "fh-fresh-ok",
        category: "freshness",
        severity: "pass",
        title: "Content is recent",
        description: `Last modified about ${Math.round(
          ageMonths
        )} months ago.`,
        recommendation: "Keep the dateModified signal current when you edit.",
        scoreImpact: 0,
        level: "page",
        source: "open-graph",
        samples: dateSample(signals),
      })
    );
  }

  return {
    findings,
    missing,
    score: Math.max(0, score),
    status: "evaluated",
  };
}

// ─── CITATION SIGNALS (max 6) ─────────────────────────────
function evaluateCitation(
  signals: HtmlSignals,
  policy: AnalysisPolicy
): {
  findings: AnalysisFinding[];
  missing: string[];
  score: number;
  status: CategoryStatus;
} {
  const findings: AnalysisFinding[] = [];
  const missing: string[] = [];
  let score = 6;

  const externalCount = signals.externalLinks.length;
  const pageHostKnown = signals.pageHost !== null;

  if (!pageHostKnown) {
    missing.push(
      "Page host could not be determined (no canonical, og:url, or <base>)"
    );
    findings.push(
      makeFinding({
        id: "ct-host-unknown",
        category: "citation",
        severity: "info",
        title: "Cannot evaluate external citations",
        description:
          "The page does not declare its own URL via a canonical link, og:url, or <base> tag, so external links cannot be reliably distinguished from internal ones.",
        recommendation:
          'Add a canonical link (<link rel="canonical">) or og:url meta tag so citation signals can be evaluated.',
        scoreImpact: 0,
        level: "page",
        source: "html-standard",
      })
    );
    return { findings, missing, score: 0, status: "insufficient-content" };
  }

  if (externalCount < policy.minExternalLinks) {
    score -= 3;
    missing.push("No external links to sources");
    findings.push(
      makeFinding({
        id: "ct-no-external",
        category: "citation",
        severity: "warning",
        title: "No external source links",
        description:
          "The page contains no outbound links to external sources that could back up its claims.",
        recommendation:
          "Cite authoritative external sources (studies, docs, official references) so AI engines can verify claims.",
        scoreImpact: 3,
        level: "page",
        source: "html-standard",
      })
    );
  } else {
    findings.push(
      makeFinding({
        id: "ct-external-ok",
        category: "citation",
        severity: "pass",
        title: "External source links present",
        description: `Detected ${externalCount} external link(s) across ${signals.externalLinkDomains.length} domain(s).`,
        recommendation: "Keep sources authoritative and specific to the claims.",
        scoreImpact: 0,
        level: "component",
        source: "html-standard",
        samples: linkSamples(signals),
      })
    );
  }

  const namedCount = signals.namedAttributionCount;
  const hasAttribution = namedCount >= policy.minAttributions;

  if (!hasAttribution) {
    score -= 3;
    missing.push("No named attribution of claims to sources");
    findings.push(
      makeFinding({
        id: "ct-no-attribution",
        category: "citation",
        severity: "warning",
        title: "Claims are not attributed to named sources",
        description:
          'No phrasing like "according to X" or "as reported by X" was detected.',
        recommendation:
          'Attribute specific claims to named sources (e.g. "According to a 2024 Gartner report…").',
        scoreImpact: 3,
        level: "component",
        source: "heuristic",
      })
    );
  } else {
    findings.push(
      makeFinding({
        id: "ct-attribution-ok",
        category: "citation",
        severity: "pass",
        title: "Claims attributed to named sources",
        description: `Detected ${namedCount} named attribution(s).`,
        recommendation: "Keep attributions specific and verifiable.",
        scoreImpact: 0,
        level: "component",
        source: "heuristic",
      })
    );
  }

  if (signals.hasCiteAttribute) {
    findings.push(
      makeFinding({
        id: "ct-cite-attribute",
        category: "citation",
        severity: "pass",
        title: "Blockquote cite attributes present",
        description:
          "One or more <blockquote> or <q> elements use the cite attribute to reference a source.",
        recommendation: "Keep citation URLs valid and specific.",
        scoreImpact: 0,
        level: "component",
        source: "html-standard",
      })
    );
  }

  return {
    findings,
    missing,
    score: Math.max(0, score),
    status: "evaluated",
  };
}

// ─── PUBLIC API ───────────────────────────────────────────
export interface RulesResult {
  categories: CategoryResult[];
  diagnostics: string[];
  mode: "scored" | "diagnostic";
  score: number | null;
  primaryEntity: string | null;
  policy: AnalysisPolicy;
  evaluatedAt: string;
}

export interface RunRulesOptions {
  crawlerStatus?: CrawlerStatus;
  policy?: AnalysisPolicy;
  now?: Date;
}

export function runRules(
  signals: HtmlSignals,
  options: RunRulesOptions = {}
): RulesResult {
  const policy = options.policy ?? DEFAULT_ANALYSIS_POLICY;
  const now = options.now ?? new Date();
  const crawlerStatus = options.crawlerStatus;

  const primaryEntity = extractPrimaryEntity(signals);

  const categories: CategoryResult[] = [];

  const as = evaluateAnswerStructure(signals, primaryEntity);
  categories.push({
    category: "answer-structure",
    label: "Answer Structure",
    maxScore: 30,
    score: as.score,
    status: "evaluated",
    findings: as.findings,
    missingSignals: as.missing,
  });

  const pi = evaluatePassageIntegrity(signals);
  categories.push({
    category: "passage-integrity",
    label: "Passage Integrity",
    maxScore: 22,
    score: pi.score,
    status: pi.status,
    findings: pi.findings,
    missingSignals: pi.missing,
  });

  const fd = evaluateFactualDensity(signals);
  categories.push({
    category: "factual-density",
    label: "Factual Density",
    maxScore: 17,
    score: fd.score,
    status: fd.status,
    findings: fd.findings,
    missingSignals: fd.missing,
  });

  const ec = evaluateEntityClarity(signals, primaryEntity);
  categories.push({
    category: "entity-clarity",
    label: "Entity Clarity",
    maxScore: 9,
    score: ec.score,
    status: "evaluated",
    findings: ec.findings,
    missingSignals: ec.missing,
  });

  const fr = evaluateFaqReadiness(signals, crawlerStatus);
  categories.push({
    category: "faq-readiness",
    label: "FAQ Readiness",
    maxScore: 8,
    score: fr.score,
    status: fr.status,
    findings: fr.findings,
    missingSignals: fr.missing,
  });

  const fh = evaluateFreshness(signals, policy, now);
  categories.push({
    category: "freshness",
    label: "Freshness",
    maxScore: 8,
    score: fh.score,
    status: fh.status,
    findings: fh.findings,
    missingSignals: fh.missing,
  });

  const ct = evaluateCitation(signals, policy);
  categories.push({
    category: "citation",
    label: "Citation Signals",
    maxScore: 6,
    score: ct.score,
    status: ct.status,
    findings: ct.findings,
    missingSignals: ct.missing,
  });

  const diagnostics: string[] = [];
  for (const cat of categories) {
    for (const m of cat.missingSignals) {
      diagnostics.push(`${cat.label}: ${m}`);
    }
  }

  const evaluatedCount = categories.filter(
    (c) => c.status === "evaluated"
  ).length;
  const mode: "scored" | "diagnostic" =
    evaluatedCount >= 5 ? "scored" : "diagnostic";
  const score =
    mode === "scored" ? categories.reduce((sum, c) => sum + c.score, 0) : null;

  return {
    categories,
    diagnostics,
    mode,
    score,
    primaryEntity,
    policy,
    evaluatedAt: now.toISOString(),
  };
}