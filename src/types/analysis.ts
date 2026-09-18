export type FindingSeverity = "info" | "warning" | "error" | "pass";

export type AnalysisCategory =
  | "structure"
  | "entity"
  | "metadata"
  | "schema"
  | "answer-readiness";

export interface FindingEvidence {
  source: string;
  value?: string;
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
  confidence?: number;
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

/**
 * Shape of pages.context as actually returned by the Marketplace SDK host.
 * The host wraps the payload in { siteInfo, pageInfo }.
 * The top-level `data` wrapper is stripped by the SDK's query() method
 * before the value reaches onSuccess, but is present on the awaited response.
 */
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