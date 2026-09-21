export type FindingSeverity = "info" | "warning" | "error" | "pass";

export type AnalysisCategory =
  | "answer-structure"
  | "passage-integrity"
  | "factual-density"
  | "entity-clarity"
  | "faq-readiness"
  | "freshness"
  | "citation";

export type CategoryStatus = "evaluated" | "insufficient-content";

export type FindingLevel = "page" | "layout" | "component" | "unknown";

export type FindingSource =
  | "open-graph"
  | "schema-org"
  | "html-standard"
  | "robots-exclusion"
  | "llms-txt"
  | "heuristic";

export interface FindingSample {
  kind: "heading" | "paragraph" | "schema" | "title" | "meta" | "link";
  value: string;
  position?: number;
}

export interface FindingEvidence {
  source: string;
  value?: string;
  count?: number;
}

export interface RewriteSuggestion {
  from: string;
  to: string;
  rationale?: string;
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
  samples?: FindingSample[];
  suggestion?: RewriteSuggestion;
  level: FindingLevel;
  automated: boolean;
  source?: FindingSource;
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

export interface AnalysisPolicy {
  staleAfterMonths: number;
  minExternalLinks: number;
  minAttributions: number;
}

export const DEFAULT_ANALYSIS_POLICY: AnalysisPolicy = {
  staleAfterMonths: 12,
  minExternalLinks: 1,
  minAttributions: 1,
};

export interface AnalysisResult {
  mode: AnalysisMode;
  score: number | null;
  categories: CategoryResult[];
  findings: AnalysisFinding[];
  diagnostics: string[];
  analyzedAt: string;
  primaryEntity: string | null;
  policy: AnalysisPolicy;
  source: {
    pageId?: string;
    language?: string;
    htmlInspected: boolean;
    wordCount: number;
    headingCount: number;
    paragraphCount: number;
  };
}

export interface DiffEntry {
  findingId: string;
  category: AnalysisCategory;
  severity: FindingSeverity;
  title: string;
  change: "resolved" | "new" | "unchanged" | "improved" | "worsened";
  previousSeverity?: FindingSeverity;
}

export interface AnalysisDiff {
  previousScore: number | null;
  currentScore: number | null;
  scoreDelta: number | null;
  entries: DiffEntry[];
  resolvedCount: number;
  newCount: number;
  unchangedCount: number;
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