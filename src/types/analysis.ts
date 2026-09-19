export type FindingSeverity = "info" | "warning" | "error" | "pass";

export type AnalysisCategory =
  | "answer-structure"
  | "passage-integrity"
  | "factual-density"
  | "entity-clarity"
  | "faq-readiness";

export interface FindingEvidence {
  source: string;
  value?: string;
  count?: number;
}

export interface AnalysisFinding {
  id: string;
  category: AnalysisCategory;
  severity: FindingSeverity;
  title: string;
  description: string;
  recommendation: string;
  scoreImpact: number;
  evidence?: FindingEvidence;
  automated: boolean;
}

export interface CategoryResult {
  category: AnalysisCategory;
  label: string;
  score: number;
  maxScore: number;
  findings: AnalysisFinding[];
}

export interface AnalysisResult {
  score: number;
  categories: CategoryResult[];
  findings: AnalysisFinding[];
  analyzedAt: string;
  source: {
    pageId?: string;
    language?: string;
    htmlInspected: boolean;
  };
}

export interface PageInfo {
  id?: string;
  itemId?: string;
  name?: string;
  displayName?: string;
  path?: string;
  language?: string;
  url?: string;
}

export interface SiteInfo {
  id?: string;
  name?: string;
  displayName?: string;
  language?: string;
}

export interface PageContext {
  pageInfo?: PageInfo;
  siteInfo?: SiteInfo;
}