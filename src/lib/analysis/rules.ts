import type { AnalysisFinding } from "@/src/types/analysis";
import type { HtmlSignals } from "./html";

export function runRules(signals: HtmlSignals): AnalysisFinding[] {
  const findings: AnalysisFinding[] = [];

  // --- Content Structure ---
  const h1 = signals.headings.filter((h) => h.level === 1);
  if (h1.length === 1) {
    findings.push({
      id: "structure-single-h1",
      category: "structure",
      severity: "pass",
      title: "Single primary heading detected",
      description: `The page contains one H1: "${h1[0].text}".`,
      recommendation: "Keep the H1 focused on the primary topic.",
      scoreImpact: 0,
      evidence: { source: "rendered-html", value: h1[0].text },
      automated: true,
    });
  } else if (h1.length === 0) {
    findings.push({
      id: "structure-missing-h1",
      category: "structure",
      severity: "error",
      title: "Primary heading is missing",
      description: "No H1 heading was detected in the rendered page.",
      recommendation: "Add one clear H1 that identifies the page's primary topic.",
      scoreImpact: 8,
      automated: true,
    });
  } else {
    findings.push({
      id: "structure-multiple-h1",
      category: "structure",
      severity: "warning",
      title: "Multiple H1 headings detected",
      description: `Detected ${h1.length} H1 headings.`,
      recommendation:
        "Use a single primary H1 unless multiple H1s are intentional and semantically justified.",
      scoreImpact: 4,
      automated: true,
    });
  }

  const jumps = signals.headings.some(
    (h, i) => i > 0 && h.level > signals.headings[i - 1].level + 1
  );
  if (signals.headings.length > 1 && jumps) {
    findings.push({
      id: "structure-heading-jump",
      category: "structure",
      severity: "warning",
      title: "Heading hierarchy contains a level jump",
      description: "At least one heading skips an intermediate heading level.",
      recommendation: "Review heading nesting so sections follow a logical hierarchy.",
      scoreImpact: 3,
      automated: true,
    });
  } else if (signals.headings.length > 1) {
    findings.push({
      id: "structure-heading-hierarchy",
      category: "structure",
      severity: "pass",
      title: "Heading hierarchy is consistent",
      description: "No obvious heading-level jumps were detected.",
      recommendation: "Keep the existing semantic hierarchy as content evolves.",
      scoreImpact: 0,
      automated: true,
    });
  }

  // --- Metadata & Discoverability ---
  if (!signals.title) {
    findings.push({
      id: "metadata-title-missing",
      category: "metadata",
      severity: "error",
      title: "Page title is missing",
      description: "No HTML title element was detected.",
      recommendation: "Provide a concise page title representing the primary topic.",
      scoreImpact: 7,
      automated: true,
    });
  } else {
    findings.push({
      id: "metadata-title-present",
      category: "metadata",
      severity: "pass",
      title: "Page title detected",
      description: "A title element is present in the rendered page.",
      recommendation: "Keep the title specific and aligned with the page topic.",
      scoreImpact: 0,
      evidence: { source: "title-element", value: signals.title },
      automated: true,
    });
  }

  if (!signals.metaDescription) {
    findings.push({
      id: "metadata-description-missing",
      category: "metadata",
      severity: "warning",
      title: "Meta description is missing",
      description: "No meta description was detected.",
      recommendation: "Add a concise description that summarizes the page's primary answer/topic.",
      scoreImpact: 5,
      automated: true,
    });
  } else {
    findings.push({
      id: "metadata-description-present",
      category: "metadata",
      severity: "pass",
      title: "Meta description detected",
      description: "A meta description is available.",
      recommendation: "Keep it representative of the actual page content.",
      scoreImpact: 0,
      evidence: { source: "meta-description", value: signals.metaDescription },
      automated: true,
    });
  }

  const ogCount = Object.keys(signals.openGraph).length;
  findings.push({
    id: "metadata-open-graph",
    category: "metadata",
    severity: ogCount >= 2 ? "pass" : "warning",
    title: ogCount >= 2 ? "OpenGraph metadata detected" : "OpenGraph metadata is limited",
    description: `${ogCount} OpenGraph properties were detected.`,
    recommendation:
      ogCount >= 2
        ? "Keep social metadata synchronized with the page content."
        : "Consider adding og:title, og:description and og:image where applicable.",
    scoreImpact: ogCount >= 2 ? 0 : 3,
    automated: true,
  });

  if (!signals.canonical) {
    findings.push({
      id: "metadata-canonical",
      category: "metadata",
      severity: "info",
      title: "Canonical URL was not detected",
      description: "The analyzer could not find a canonical link element.",
      recommendation: "Verify canonical configuration if the published site requires it.",
      scoreImpact: 0,
      automated: true,
    });
  }

  // --- Structured Data ---
  if (signals.jsonLd.length === 0) {
    findings.push({
      id: "schema-jsonld-missing",
      category: "schema",
      severity: "warning",
      title: "JSON-LD was not detected",
      description: "No JSON-LD script block was found in the rendered page.",
      recommendation:
        "Add structured data when the page represents an entity supported by a relevant schema vocabulary.",
      scoreImpact: 7,
      automated: true,
    });
  } else {
    const invalid = signals.jsonLd.some(
      (x) => typeof x === "object" && x !== null && "invalidJsonLd" in x
    );
    findings.push({
      id: "schema-jsonld-present",
      category: "schema",
      severity: invalid ? "error" : "pass",
      title: invalid ? "Invalid JSON-LD detected" : "JSON-LD detected",
      description: invalid
        ? "At least one JSON-LD block could not be parsed as JSON."
        : `${signals.jsonLd.length} JSON-LD block(s) were detected.`,
      recommendation: invalid
        ? "Fix malformed JSON-LD and validate the resulting structured data."
        : "Keep structured data consistent with visible page content.",
      scoreImpact: invalid ? 7 : 0,
      automated: true,
    });
  }

  // --- Answer Readiness ---
  const wordCount = signals.text.split(/\s+/).filter(Boolean).length;
  if (wordCount < 80) {
    findings.push({
      id: "answer-short-content",
      category: "answer-readiness",
      severity: "warning",
      title: "Limited answer context detected",
      description: `Only about ${wordCount} words of rendered text were detected.`,
      recommendation:
        "If the page is intended to answer a substantive question, provide enough context to define the topic and support the answer.",
      scoreImpact: 7,
      automated: true,
    });
  } else {
    findings.push({
      id: "answer-sufficient-context",
      category: "answer-readiness",
      severity: "pass",
      title: "Sufficient page context detected",
      description: `About ${wordCount} words of rendered text were detected.`,
      recommendation:
        "Keep the most important answer and definition close to the beginning of the page.",
      scoreImpact: 0,
      automated: true,
    });
  }

  // --- Entity Clarity ---
  const definitionPatterns = /\b(is|are|refers to|defined as|means|known as)\b/i;
  if (!definitionPatterns.test(signals.text.slice(0, 1600))) {
    findings.push({
      id: "entity-definition",
      category: "entity",
      severity: "warning",
      title: "Primary entity may not be explicitly defined",
      description:
        "No common definition pattern was detected near the beginning of the rendered content.",
      recommendation:
        "Add a concise definition of the page's primary entity or topic near the beginning.",
      scoreImpact: 6,
      automated: true,
    });
  } else {
    findings.push({
      id: "entity-definition-present",
      category: "entity",
      severity: "pass",
      title: "Definition-style language detected",
      description:
        "The opening content contains language commonly used to define a topic or entity.",
      recommendation: "Keep the definition concise and consistent with the rest of the page.",
      scoreImpact: 0,
      automated: true,
    });
  }

  return findings;
}