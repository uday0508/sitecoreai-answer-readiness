import type { AnalysisResult, AnalysisFinding } from "@/src/types/analysis";
import type { HtmlSignals } from "./html";
import type { RulesResult } from "./rules";

export function calculateResult(
  rules: RulesResult,
  signals: HtmlSignals,
  pageId?: string,
  language?: string
): AnalysisResult {
  const findings: AnalysisFinding[] = rules.categories.flatMap((c) => c.findings);

  const htmlInspected =
    Boolean(signals.title) ||
    Boolean(signals.firstParagraph) ||
    signals.headings.length > 0 ||
    signals.jsonLd.length > 0;

  return {
    mode: rules.mode,
    score: rules.score,
    categories: rules.categories,
    findings,
    diagnostics: rules.diagnostics,
    analyzedAt: rules.evaluatedAt,
    primaryEntity: rules.primaryEntity,
    policy: rules.policy,
    source: {
      pageId,
      language,
      htmlInspected,
      wordCount: signals.wordCount,
      headingCount: signals.headings.length,
      paragraphCount: signals.paragraphs.length,
    },
  };
}