import type {
  AnalysisFinding,
  CrawlerStatus,
  CategoryResult,
  AnalysisCategory,
  CategoryStatus,
} from "@/src/types/analysis";
import type { HtmlSignals } from "./html";

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
  { category: "answer-structure", label: "Answer Structure", maxScore: 35 },
  { category: "passage-integrity", label: "Passage Integrity", maxScore: 25 },
  { category: "factual-density", label: "Factual Density", maxScore: 20 },
  { category: "entity-clarity", label: "Entity Clarity", maxScore: 10 },
  { category: "faq-readiness", label: "FAQ Readiness", maxScore: 10 },
];

function makeFinding(
  partial: Omit<AnalysisFinding, "automated">
): AnalysisFinding {
  return { ...partial, automated: true };
}

// ─────────────────────────────────────────────────────────
// ANSWER STRUCTURE
// ─────────────────────────────────────────────────────────
function evaluateAnswerStructure(signals: HtmlSignals): {
  findings: AnalysisFinding[];
  missing: string[];
  score: number;
} {
  const findings: AnalysisFinding[] = [];
  const missing: string[] = [];
  let score = 35;

  const h1s = signals.headings.filter((h) => h.level === 1);
  const h2s = signals.headings.filter((h) => h.level === 2);
  const hasStructuralHeading = h1s.length > 0 || h2s.length > 0;

  if (!hasStructuralHeading) {
    score -= 10;
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
        scoreImpact: 10,
      })
    );
  } else if (h1s.length === 0) {
    score -= 5;
    missing.push("No H1 heading");
    findings.push(
      makeFinding({
        id: "as-no-h1",
        category: "answer-structure",
        severity: "warning",
        title: "No H1 heading detected",
        description: "Section headings exist but the page has no primary H1.",
        recommendation: "Add one H1 that names the page topic.",
        scoreImpact: 5,
      })
    );
  }

  const firstParaWords = signals.firstParagraph.split(/\s+/).filter(Boolean).length;

  if (!signals.firstParagraph) {
    score -= 10;
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
        scoreImpact: 10,
      })
    );
  } else if (firstParaWords < 20) {
    score -= 6;
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
        scoreImpact: 6,
        evidence: { source: "first-paragraph", value: signals.firstParagraph.slice(0, 160) },
      })
    );
  } else if (firstParaWords > 120) {
    score -= 4;
    missing.push("Opening paragraph is too long to be extracted as a single answer");
    findings.push(
      makeFinding({
        id: "as-opening-long",
        category: "answer-structure",
        severity: "warning",
        title: "Opening paragraph is too long",
        description: `The opening paragraph contains about ${firstParaWords} words.`,
        recommendation:
          "Split the opening into a short answer-first sentence (under 60 words) followed by supporting detail.",
        scoreImpact: 4,
        evidence: { source: "first-paragraph", value: signals.firstParagraph.slice(0, 160) },
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
      })
    );
  }

  const totalHeadings = signals.headings.length;
  const questionRatio = totalHeadings > 0 ? signals.questionHeadings / totalHeadings : 0;

  if (totalHeadings > 0 && questionRatio < MIN_HEADING_QUESTION_RATIO) {
    const deduction = signals.questionHeadings === 0 ? 8 : 4;
    score -= deduction;
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
        evidence: { source: "headings", count: totalHeadings },
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
        recommendation: "Keep question headings aligned with real user queries.",
        scoreImpact: 0,
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
      })
    );
  }

  return { findings, missing, score: Math.max(0, score) };
}

// ─────────────────────────────────────────────────────────
// PASSAGE INTEGRITY
// ─────────────────────────────────────────────────────────
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
      `Only ${signals.paragraphs.length} paragraph(s) of substance detected — need at least ${MIN_PARAGRAPHS_FOR_PASSAGE} to evaluate passage integrity`
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
        scoreImpact: 25,
      })
    );
    return { findings, missing, score: 0, status: "insufficient-content" };
  }

  let score = 25;

  if (signals.selfContainedIssues > 0) {
    score -= 8;
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
        scoreImpact: 8,
        evidence: { source: "rendered-html", count: signals.selfContainedIssues },
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
      })
    );
  }

  const heavyRatio = signals.pronounHeavySections / signals.paragraphs.length;

  if (heavyRatio > 0.3) {
    score -= 10;
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
        scoreImpact: 10,
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
      })
    );
  }

  return { findings, missing, score: Math.max(0, score), status: "evaluated" };
}

// ─────────────────────────────────────────────────────────
// FACTUAL DENSITY
// ─────────────────────────────────────────────────────────
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
      `Only ${signals.wordCount} words — need at least ${MIN_WORDS_FOR_DENSITY} to evaluate factual density`
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
        scoreImpact: 20,
      })
    );
    return { findings, missing, score: 0, status: "insufficient-content" };
  }

  let score = 20;
  const density = (signals.factualMarkers / signals.wordCount) * 100;

  if (signals.factualMarkers < MIN_FACTUAL_MARKERS) {
    score -= 12;
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
          "Add specific numbers, dates, percentages, or comparisons. AI systems preferentially quote concrete claims.",
        scoreImpact: 12,
        evidence: { source: "rendered-html", count: signals.factualMarkers },
      })
    );
  } else if (density < 0.5) {
    score -= 6;
    missing.push("Low factual density");
    findings.push(
      makeFinding({
        id: "fd-low",
        category: "factual-density",
        severity: "info",
        title: "Low factual density",
        description: `Detected ${signals.factualMarkers} factual marker(s) across ${signals.wordCount} words.`,
        recommendation: "Add more concrete facts so AI systems have quotable material.",
        scoreImpact: 6,
        evidence: { source: "rendered-html", count: signals.factualMarkers },
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
      })
    );
  }

  return { findings, missing, score: Math.max(0, score), status: "evaluated" };
}

// ─────────────────────────────────────────────────────────
// ENTITY CLARITY
// ─────────────────────────────────────────────────────────
function evaluateEntityClarity(signals: HtmlSignals): {
  findings: AnalysisFinding[];
  missing: string[];
  score: number;
} {
  const findings: AnalysisFinding[] = [];
  const missing: string[] = [];
  let score = 10;

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
        evidence: { source: "title", value: signals.title },
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
      })
    );
  }

  const hasAuthor =
    signals.hasAuthorMeta || signals.hasAuthorSchema || signals.hasVisibleByline;

  if (!hasAuthor) {
    score -= 2;
    missing.push("No author attribution (meta, schema, or byline)");
    findings.push(
      makeFinding({
        id: "ec-author-missing",
        category: "entity-clarity",
        severity: "info",
        title: "No author attribution detected",
        description: "No author meta, Person schema, or visible byline was found.",
        recommendation:
          "Add author attribution for editorial content. AI systems favor content with clear provenance.",
        scoreImpact: 2,
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
        recommendation: "Keep author signals consistent across meta, schema, and byline.",
        scoreImpact: 0,
      })
    );
  }

  if (signals.hasLocalhostUrls) {
    score -= 2;
    missing.push("Metadata contains localhost URLs");
    findings.push(
      makeFinding({
        id: "ec-localhost",
        category: "entity-clarity",
        severity: "warning",
        title: "Localhost URLs detected in page metadata",
        description: "Canonical, OpenGraph, or JSON-LD URLs point to a localhost address.",
        recommendation: "Replace all localhost references with production HTTPS URLs.",
        scoreImpact: 2,
      })
    );
  }

  return { findings, missing, score: Math.max(0, score) };
}

// ─────────────────────────────────────────────────────────
// FAQ READINESS
// ─────────────────────────────────────────────────────────
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

  const hasFaqContent =
    /faq|frequently asked|questions/i.test(signals.text.slice(0, 4000)) ||
    signals.questionHeadings >= 2;

  const hasAnyFaqSurface = signals.hasFaqSchema || hasFaqContent;

  if (!hasAnyFaqSurface) {
    missing.push(
      "No FAQ content or FAQPage structured data — no extractable Q&A surface"
    );
    findings.push(
      makeFinding({
        id: "fr-no-surface",
        category: "faq-readiness",
        severity: "warning",
        title: "No FAQ or Q&A structure detected",
        description:
          "The page contains no question headings, no FAQ section, and no FAQPage schema.",
        recommendation:
          "Add a FAQ section with 3–5 questions users are likely to ask, and pair it with FAQPage JSON-LD.",
        scoreImpact: 10,
      })
    );
    return { findings, missing, score: 0, status: "insufficient-content" };
  }

  let score = 10;

  if (signals.hasFaqSchema && hasFaqContent) {
    findings.push(
      makeFinding({
        id: "fr-schema-content-ok",
        category: "faq-readiness",
        severity: "pass",
        title: "FAQPage schema matches visible FAQ content",
        description: "Structured data and visible Q&A content are aligned.",
        recommendation: "Keep schema synchronized with visible content.",
        scoreImpact: 0,
      })
    );
  } else if (signals.hasFaqSchema && !hasFaqContent) {
    score -= 6;
    missing.push("FAQPage schema present but no visible FAQ content");
    findings.push(
      makeFinding({
        id: "fr-schema-mismatch",
        category: "faq-readiness",
        severity: "warning",
        title: "FAQPage schema present but no visible FAQ content",
        description:
          "Structured data declares FAQPage, but the rendered page does not contain matching Q&A content.",
        recommendation:
          "Either add visible FAQ content or remove the schema. Mismatched schema reduces trust.",
        scoreImpact: 6,
      })
    );
  } else if (!signals.hasFaqSchema && hasFaqContent) {
    score -= 4;
    missing.push("FAQ content without FAQPage schema");
    findings.push(
      makeFinding({
        id: "fr-content-no-schema",
        category: "faq-readiness",
        severity: "info",
        title: "FAQ content without FAQPage schema",
        description:
          "The page contains Q&A-style content but no matching FAQPage structured data.",
        recommendation:
          "Add FAQPage schema. It is the one structured data type consistently correlated with AI citations.",
        scoreImpact: 4,
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
          "If you want content cited in the Gemini app or Vertex AI, unblock Google-Extended. AI Overviews are unaffected.",
        scoreImpact: 0,
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
      })
    );
  }

  return { findings, missing, score: Math.max(0, score), status: "evaluated" };
}

// ─────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────
export interface RulesResult {
  categories: CategoryResult[];
  diagnostics: string[];
  mode: "scored" | "diagnostic";
  score: number | null;
}

export function runRules(
  signals: HtmlSignals,
  crawlerStatus?: CrawlerStatus
): RulesResult {
  const categories: CategoryResult[] = [];

  const as = evaluateAnswerStructure(signals);
  categories.push({
    category: "answer-structure",
    label: "Answer Structure",
    maxScore: 35,
    score: as.score,
    status: "evaluated",
    findings: as.findings,
    missingSignals: as.missing,
  });

  const pi = evaluatePassageIntegrity(signals);
  categories.push({
    category: "passage-integrity",
    label: "Passage Integrity",
    maxScore: 25,
    score: pi.score,
    status: pi.status,
    findings: pi.findings,
    missingSignals: pi.missing,
  });

  const fd = evaluateFactualDensity(signals);
  categories.push({
    category: "factual-density",
    label: "Factual Density",
    maxScore: 20,
    score: fd.score,
    status: fd.status,
    findings: fd.findings,
    missingSignals: fd.missing,
  });

  const ec = evaluateEntityClarity(signals);
  categories.push({
    category: "entity-clarity",
    label: "Entity Clarity",
    maxScore: 10,
    score: ec.score,
    status: "evaluated",
    findings: ec.findings,
    missingSignals: ec.missing,
  });

  const fr = evaluateFaqReadiness(signals, crawlerStatus);
  categories.push({
    category: "faq-readiness",
    label: "FAQ Readiness",
    maxScore: 10,
    score: fr.score,
    status: fr.status,
    findings: fr.findings,
    missingSignals: fr.missing,
  });

  // Collect all missing signals across categories
  const diagnostics: string[] = [];
  for (const cat of categories) {
    for (const m of cat.missingSignals) {
      diagnostics.push(`${cat.label}: ${m}`);
    }
  }

  // Decide mode: scored only if at least 3 of 5 categories are evaluated
  const evaluatedCount = categories.filter((c) => c.status === "evaluated").length;
  const mode: "scored" | "diagnostic" =
    evaluatedCount >= 3 ? "scored" : "diagnostic";

  const score =
    mode === "scored" ? categories.reduce((sum, c) => sum + c.score, 0) : null;

  return { categories, diagnostics, mode, score };
}