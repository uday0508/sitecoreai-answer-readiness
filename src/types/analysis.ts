export type FindingSeverity = "info" | "warning" | "error" | "pass";

export type AnalysisCategory =
  | "answer-structure"
  | "passage-integrity"
  | "factual-density"
  | "entity-clarity"
  | "faq-readiness";

export type CategoryStatus = "evaluated" | "insufficient-content";

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
  status: CategoryStatus;
  score: number;
  maxScore: number;
  findings: AnalysisFinding[];
  missingSignals: string[];
}

export type AnalysisMode = "scored" | "diagnostic";

export interface AnalysisResult {
  mode: AnalysisMode;
  score: number | null;
  categories: CategoryResult[];
  findings: AnalysisFinding[];
  diagnostics: string[];
  analyzedAt: string;
  source: {
    pageId?: string;
    language?: string;
    htmlInspected: boolean;
    wordCount: number;
    headingCount: number;
    paragraphCount: number;
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
  hostId?: string;
  targetHostname?: string;
  scheme?: string;
}

export interface PageContext {
  pageInfo?: PageInfo;
  siteInfo?: SiteInfo;
}

export interface CrawlerStatus {
  googleExtendedBlocked: boolean;
  llmsTxtPresent: boolean;
  checked: boolean;
}