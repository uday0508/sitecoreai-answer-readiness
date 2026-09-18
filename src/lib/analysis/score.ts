import type {
  AnalysisCategory,
  AnalysisFinding,
  AnalysisResult,
  CategoryResult,
} from "@/src/types/analysis";
import type { HtmlSignals } from "./html";

const categoryConfig: Array<{ category: AnalysisCategory; label: string; maxScore: number }> = [
  { category: "answer-structure", label: "Answer Structure", maxScore: 35 },
  { category: "passage-integrity", label: "Passage Integrity", maxScore: 25 },
  { category: "factual-density", label: "Factual Density", maxScore: 20 },
  { category: "entity-clarity", label: "Entity Clarity", maxScore: 10 },
  { category: "faq-readiness", label: "FAQ Readiness", maxScore: 10 },
];

export function calculateResult(
  findings: AnalysisFinding[],
  signals: HtmlSignals,
  pageId?: string,
  language?: string
): AnalysisResult {
  const categories: CategoryResult[] = categoryConfig.map((config) => {
    const categoryFindings = findings.filter((f) => f.category === config.category);
    const deduction = categoryFindings.reduce((sum, f) => sum + Math.max(0, f.scoreImpact), 0);
    const rawScore = config.maxScore - Math.min(config.maxScore, deduction);
    return {
      ...config,
      score: Math.max(0, Math.round(rawScore)),
      findings: categoryFindings,
    };
  });

  const htmlInspected =
    Boolean(signals.title) ||
    Boolean(signals.firstParagraph) ||
    signals.headings.length > 0 ||
    signals.jsonLd.length > 0;

  return {
    score: categories.reduce((sum, c) => sum + c.score, 0),
    categories,
    findings,
    analyzedAt: new Date().toISOString(),
    source: { pageId, language, htmlInspected },
  };
}