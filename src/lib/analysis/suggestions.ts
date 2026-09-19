import type { HtmlSignals } from "./html";
import type { RewriteSuggestion } from "@/src/types/analysis";

/**
 * Extract the primary entity from the page title or H1.
 * Used to build natural rewrite suggestions.
 */
export function extractPrimaryEntity(signals: HtmlSignals): string | null {
  // Prefer H1
  const h1 = signals.headings.find((h) => h.level === 1);
  if (h1?.text) {
    const cleaned = h1.text.replace(/[:|—–-].*$/, "").trim();
    if (cleaned.length > 0 && cleaned.length <= 60) return cleaned;
  }

  // Fall back to title
  if (signals.title) {
    const cleaned = signals.title.split(/[:|—–-]/)[0].trim();
    if (cleaned.length > 0 && cleaned.length <= 60) return cleaned;
  }

  return null;
}

/**
 * Given a heading that is not phrased as a question, suggest a question-form rewrite.
 */
export function suggestHeadingRewrite(heading: string, entity: string | null): RewriteSuggestion | null {
  const trimmed = heading.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();
  const subject = entity ?? "this topic";

  if (lower === "overview" || lower === "introduction" || lower === "intro") {
    return {
      from: trimmed,
      to: `What is ${subject}?`,
      rationale: "Question-form headings map directly to how users ask.",
    };
  }

  if (lower.includes("features") || lower.includes("benefits")) {
    return {
      from: trimmed,
      to: `What features does ${subject} offer?`,
      rationale: "Product-feature questions match buyer intent.",
    };
  }

  if (lower.includes("pricing") || lower.includes("cost") || lower.includes("plans")) {
    return {
      from: trimmed,
      to: `How much does ${subject} cost?`,
      rationale: "Pricing questions are high-intent AEO queries.",
    };
  }

  if (lower.includes("getting started") || lower.includes("setup") || lower.includes("install")) {
    return {
      from: trimmed,
      to: `How do I get started with ${subject}?`,
      rationale: "Step-by-step queries align with how-to answer extraction.",
    };
  }

  if (lower.includes("faq") || lower.includes("questions")) {
    return {
      from: trimmed,
      to: `Frequently asked questions about ${subject}`,
      rationale: "FAQ headings pair well with FAQPage schema.",
    };
  }

  // Generic: prefix with "What is" when heading looks like a noun phrase
  if (/^[A-Z][a-z]+(\s+[A-Za-z]+){0,3}$/.test(trimmed)) {
    return {
      from: trimmed,
      to: `What is ${trimmed}?`,
      rationale: "Consider a question-form heading to align with user queries.",
    };
  }

  return null;
}

/**
 * Suggest a stronger opening paragraph when the current one is too short or too long.
 */
export function suggestOpeningRewrite(
  firstParagraph: string,
  entity: string | null
): RewriteSuggestion | null {
  if (!firstParagraph) {
    return {
      from: "(no opening paragraph)",
      to: `${entity ?? "This page"} is ...`,
      rationale: "Start with a definition to make the page answer-extractable.",
    };
  }
  return null;
}