import type {
  AnalysisCategory,
  AnalysisFinding,
  AnalysisResult,
  CategoryResult,
} from "@/src/types/analysis";
import type { HtmlSignals } from "./html";

const categoryConfig: Array<{ category: AnalysisCategory; label: string; maxScore: number }> = [
  { category: "structure", label: "Content Structure", maxScore: 20 },
  { category: "entity", label: "Entity Clarity", maxScore: 20 },
  { category: "metadata", label: "Metadata & Discoverability", maxScore: 20 },
  { category: "schema", label: "Structured Data", maxScore: 20 },
  { category: "answer-readiness", label: "Answer Readiness", maxScore: 20 },
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
    return {
      ...config,
      score: Math.max(0, config.maxScore - Math.min(config.maxScore, deduction)),
      findings: categoryFindings,
    };
  });

  const htmlInspected =
    Boolean(signals.title) ||
    Boolean(signals.metaDescription) ||
    signals.headings.length > 0 ||
    signals.jsonLd.length > 0;

  return {
    score: categories.reduce((sum, c) => sum + c.score, 0),
    categories,
    findings,
    analyzedAt: new Date().toISOString(),
    source: {
      pageId,
      language,
      htmlInspected,
    },
  };
}