import type { AnalysisFinding } from "@/src/types/analysis";
import type { HtmlSignals } from "./html";

const MIN_WORDS_FOR_DENSITY = 100;

export function runRules(signals: HtmlSignals): AnalysisFinding[] {
  const findings: AnalysisFinding[] = [];

  // ─── ANSWER STRUCTURE ─────────────────────────────────────
  const firstPara = signals.firstParagraph ?? "";
  const firstParaWords = firstPara.split(/\s+/).filter(Boolean).length;

  if (!firstPara) {
    findings.push({
      id: "answer-first-paragraph-missing",
      category: "answer-structure",
      severity: "error",
      title: "No opening answer paragraph detected",
      description:
        "The page does not expose a clear opening paragraph that could be extracted as an answer.",
      recommendation:
        "Start the page with a short paragraph that answers the primary question in the first 1–2 sentences.",
      scoreImpact: 10,
      automated: true,
    });
  } else if (firstParaWords > 120) {
    findings.push({
      id: "answer-first-paragraph-long",
      category: "answer-structure",
      severity: "warning",
      title: "Opening paragraph is too long to be extractable",
      description: `The opening paragraph contains about ${firstParaWords} words before a clear answer boundary.`,
      recommendation:
        "Split the opening into a short answer-first sentence (under 60 words) followed by supporting detail.",
      scoreImpact: 5,
      evidence: { source: "first-paragraph", value: firstPara.slice(0, 160), count: firstParaWords },
      automated: true,
    });
  } else {
    findings.push({
      id: "answer-first-paragraph-ok",
      category: "answer-structure",
      severity: "pass",
      title: "Answer-first opening paragraph detected",
      description: `The page opens with a focused paragraph of about ${firstParaWords} words.`,
      recommendation: "Keep the opening answer-focused.",
      scoreImpact: 0,
      evidence: { source: "first-paragraph", value: firstPara.slice(0, 160) },
      automated: true,
    });
  }

  const totalHeadings = signals.headings.length;
  const questionRatio = totalHeadings > 0 ? signals.questionHeadings / totalHeadings : 0;

  if (totalHeadings === 0) {
    findings.push({
      id: "answer-structure-no-headings",
      category: "answer-structure",
      severity: "warning",
      title: "No section headings detected",
      description: "The page contains no structural headings to anchor answer extraction.",
      recommendation:
        'Add headings that mirror how users phrase their questions (e.g., "What is...", "How do I...").',
      scoreImpact: 6,
      automated: true,
    });
  } else if (signals.questionHeadings === 0) {
    findings.push({
      id: "answer-structure-no-question-headings",
      category: "answer-structure",
      severity: "warning",
      title: "No question-style headings detected",
      description: `Detected ${totalHeadings} headings, but none are phrased as user questions.`,
      recommendation:
        "Rewrite key section headings as the questions users ask. Question headings align with how AI connects queries to answers.",
      scoreImpact: 6,
      evidence: { source: "headings", count: totalHeadings },
      automated: true,
    });
  } else if (questionRatio < 0.3) {
    findings.push({
      id: "answer-structure-few-question-headings",
      category: "answer-structure",
      severity: "info",
      title: "Few question-style headings",
      description: `Only ${signals.questionHeadings} of ${totalHeadings} headings are phrased as questions.`,
      recommendation: "Convert more headings to question form so AI systems can align them with queries.",
      scoreImpact: 2,
      automated: true,
    });
  } else {
    findings.push({
      id: "answer-structure-question-headings",
      category: "answer-structure",
      severity: "pass",
      title: "Question-style headings detected",
      description: `${signals.questionHeadings} of ${totalHeadings} headings are phrased as questions.`,
      recommendation: "Keep question headings aligned with real user queries.",
      scoreImpact: 0,
      automated: true,
    });
  }

  const scannable = signals.lists + signals.tables;
  if (scannable === 0 && totalHeadings >= 3) {
    findings.push({
      id: "answer-structure-no-scannable",
      category: "answer-structure",
      severity: "info",
      title: "No lists or tables detected",
      description: "The page contains no bulleted lists or tables for AI systems to extract.",
      recommendation: "Use lists or tables where the content naturally fits a structured format.",
      scoreImpact: 2,
      automated: true,
    });
  } else if (scannable > 0) {
    findings.push({
      id: "answer-structure-scannable",
      category: "answer-structure",
      severity: "pass",
      title: "Scannable content structure detected",
      description: `Detected ${signals.lists} list(s) and ${signals.tables} table(s).`,
      recommendation: "Continue using lists and tables for structured claims.",
      scoreImpact: 0,
      automated: true,
    });
  }

  // ─── PASSAGE INTEGRITY ────────────────────────────────────
  if (signals.selfContainedIssues > 0) {
    findings.push({
      id: "passage-self-containment",
      category: "passage-integrity",
      severity: "warning",
      title: "Passages depend on surrounding context",
      description: `Detected ${signals.selfContainedIssues} backward/forward reference(s) such as "as mentioned above".`,
      recommendation:
        "Make each section self-contained. AI systems extract passages in isolation.",
      scoreImpact: 6,
      evidence: { source: "rendered-html", count: signals.selfContainedIssues },
      automated: true,
    });
  } else {
    findings.push({
      id: "passage-self-containment-ok",
      category: "passage-integrity",
      severity: "pass",
      title: "No context-dependent references detected",
      description: 'The page does not rely on phrases like "as mentioned above."',
      recommendation: "Keep each passage self-contained.",
      scoreImpact: 0,
      automated: true,
    });
  }

  const heavyRatio =
    signals.paragraphs.length > 0
      ? signals.pronounHeavySections / signals.paragraphs.length
      : 0;

  if (heavyRatio > 0.3) {
    findings.push({
      id: "passage-pronoun-density",
      category: "passage-integrity",
      severity: "warning",
      title: "High pronoun density in sections",
      description: `${signals.pronounHeavySections} of ${signals.paragraphs.length} paragraphs rely heavily on pronouns.`,
      recommendation:
        "Replace ambiguous pronouns with the actual entity name so passages make sense out of context.",
      scoreImpact: 5,
      automated: true,
    });
  } else if (heavyRatio > 0) {
    findings.push({
      id: "passage-pronoun-density-low",
      category: "passage-integrity",
      severity: "info",
      title: "Some paragraphs rely on pronouns",
      description: `${signals.pronounHeavySections} paragraph(s) show elevated pronoun density.`,
      recommendation: "Review those paragraphs for self-containment.",
      scoreImpact: 2,
      automated: true,
    });
  } else {
    findings.push({
      id: "passage-pronoun-density-ok",
      category: "passage-integrity",
      severity: "pass",
      title: "Pronoun density is acceptable",
      description: "Paragraphs do not depend on pronouns for meaning.",
      recommendation: "Maintain explicit entity references.",
      scoreImpact: 0,
      automated: true,
    });
  }

  // ─── FACTUAL DENSITY ──────────────────────────────────────
  const wordCount = signals.text.split(/\s+/).filter(Boolean).length;
  const density =
    wordCount >= MIN_WORDS_FOR_DENSITY
      ? (signals.factualMarkers / wordCount) * 100
      : 0;

  if (wordCount < MIN_WORDS_FOR_DENSITY) {
    findings.push({
      id: "factual-density-short-page",
      category: "factual-density",
      severity: "info",
      title: "Page too short for density analysis",
      description: `Only about ${wordCount} words detected.`,
      recommendation: "Expand the page if it is meant to answer a substantive question.",
      scoreImpact: 0,
      automated: true,
    });
  } else if (signals.factualMarkers === 0) {
    findings.push({
      id: "factual-density-missing",
      category: "factual-density",
      severity: "warning",
      title: "No factual markers detected",
      description:
        "No numbers, dates, percentages, or comparisons were found in the rendered content.",
      recommendation:
        "Add specific, verifiable facts. AI systems preferentially quote concrete claims.",
      scoreImpact: 8,
      automated: true,
    });
  } else if (density < 0.5) {
    findings.push({
      id: "factual-density-low",
      category: "factual-density",
      severity: "info",
      title: "Low factual density",
      description: `Detected ${signals.factualMarkers} factual marker(s) across ${wordCount} words.`,
      recommendation: "Add more concrete facts so AI systems have quotable material.",
      scoreImpact: 3,
      evidence: { source: "rendered-html", count: signals.factualMarkers },
      automated: true,
    });
  } else {
    findings.push({
      id: "factual-density-ok",
      category: "factual-density",
      severity: "pass",
      title: "Good factual density",
      description: `Detected ${signals.factualMarkers} factual marker(s) across ${wordCount} words.`,
      recommendation: "Continue using specific, verifiable claims.",
      scoreImpact: 0,
      automated: true,
    });
  }

  // ─── ENTITY CLARITY ───────────────────────────────────────
  const definitionPatterns = /\b(is|are|refers to|defined as|means|known as)\b/i;
  const openingText = signals.text.slice(0, 1600);

  if (!definitionPatterns.test(openingText)) {
    findings.push({
      id: "entity-definition-missing",
      category: "entity-clarity",
      severity: "warning",
      title: "Primary entity may not be explicitly defined",
      description:
        "No definition-style language was detected near the beginning of the content.",
      recommendation:
        'Add a concise, self-contained definition near the top (e.g., "X is Y").',
      scoreImpact: 6,
      automated: true,
    });
  } else {
    findings.push({
      id: "entity-definition-present",
      category: "entity-clarity",
      severity: "pass",
      title: "Definition-style language detected",
      description: "The opening content contains definition-style language.",
      recommendation: "Keep the definition concise and self-contained.",
      scoreImpact: 0,
      automated: true,
    });
  }

  if (!signals.title) {
    findings.push({
      id: "entity-title-missing",
      category: "entity-clarity",
      severity: "warning",
      title: "Page title is missing",
      description: "No title element was detected in the rendered page.",
      recommendation: "Provide a title that names the primary entity and mirrors the query.",
      scoreImpact: 4,
      automated: true,
    });
  } else {
    findings.push({
      id: "entity-title-present",
      category: "entity-clarity",
      severity: "pass",
      title: "Page title detected",
      description: "A title element names the page topic.",
      recommendation: "Keep the title specific and query-aligned.",
      scoreImpact: 0,
      evidence: { source: "title", value: signals.title },
      automated: true,
    });
  }

  // ─── FAQ READINESS ────────────────────────────────────────
  const hasFaqContent =
    /faq|frequently asked|questions/i.test(signals.text.slice(0, 4000)) ||
    signals.questionHeadings >= 2;

  if (signals.hasFaqSchema && hasFaqContent) {
    findings.push({
      id: "faq-schema-with-content",
      category: "faq-readiness",
      severity: "pass",
      title: "FAQPage schema and FAQ content detected",
      description: "The page exposes FAQPage structured data and matching visible content.",
      recommendation: "Keep FAQ schema synchronized with visible Q&A content.",
      scoreImpact: 0,
      automated: true,
    });
  } else if (signals.hasFaqSchema && !hasFaqContent) {
    findings.push({
      id: "faq-schema-without-content",
      category: "faq-readiness",
      severity: "warning",
      title: "FAQPage schema present but no visible FAQ content",
      description:
        "Structured data declares FAQPage, but the rendered page does not contain matching Q&A content.",
      recommendation:
        "Add visible FAQ content that matches the schema, or remove the schema. Mismatched schema reduces trust.",
      scoreImpact: 5,
      automated: true,
    });
  } else if (!signals.hasFaqSchema && hasFaqContent) {
    findings.push({
      id: "faq-content-without-schema",
      category: "faq-readiness",
      severity: "info",
      title: "FAQ content detected without FAQPage schema",
      description: "The page contains Q&A-style content but no FAQPage structured data.",
      recommendation:
        "Add FAQPage schema. FAQPage is the one structured data type consistently correlated with AI citations.",
      scoreImpact: 2,
      automated: true,
    });
  } else if (signals.questionHeadings >= 1) {
    findings.push({
      id: "faq-opportunity",
      category: "faq-readiness",
      severity: "info",
      title: "FAQ opportunity detected",
      description: "The page contains question-style headings but no consolidated Q&A section.",
      recommendation:
        "Consolidate likely user questions into a dedicated FAQ section with concise, self-contained answers.",
      scoreImpact: 3,
      automated: true,
    });
  } else {
    findings.push({
      id: "faq-opportunity-strong",
      category: "faq-readiness",
      severity: "warning",
      title: "No FAQ structure detected",
      description: "The page contains no question headings and no FAQ content.",
      recommendation:
        "Add a short FAQ section with 3–5 questions users are likely to ask. Pair with FAQPage schema.",
      scoreImpact: 5,
      automated: true,
    });
  }

  // ─── PUBLISH-READINESS (Page Builder specific) ────────────
  if (signals.hasLocalhostUrls) {
    findings.push({
      id: "publish-localhost-urls",
      category: "entity-clarity",
      severity: "warning",
      title: "Localhost URLs detected in page metadata",
      description:
        "Canonical, OpenGraph, or JSON-LD URLs point to a localhost address.",
      recommendation:
        "Replace all localhost references with production HTTPS URLs before publishing.",
      scoreImpact: 4,
      automated: true,
    });
  }

  if (signals.genericAltTexts > 0) {
    findings.push({
      id: "publish-generic-alt-text",
      category: "entity-clarity",
      severity: "info",
      title: "Generic image alt text detected",
      description: `Found ${signals.genericAltTexts} image(s) with placeholder alt text like "Card 1".`,
      recommendation:
        "Replace generic alt text with descriptive, entity-specific descriptions.",
      scoreImpact: 2,
      evidence: { source: "rendered-html", count: signals.genericAltTexts },
      automated: true,
    });
  }

  return findings;
}