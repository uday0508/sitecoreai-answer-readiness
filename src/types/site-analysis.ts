import type { AnalysisCategory } from "./analysis";

export interface SitePageSummary {
  pageId: string;
  name: string;
  path: string;
  language: string;
  siteName: string;
  siteDisplayName: string;
  score: number | null;
  mode: "scored" | "diagnostic";
  issueCount: number;
  criticalCount: number;
  categoryScores: Record<AnalysisCategory, { score: number; maxScore: number }>;
  topIssues: string[];
  analyzedAt: string;
  error?: string;
}

export interface SiteAnalysisProgress {
  status: "idle" | "loading-sites" | "loading-pages" | "analyzing" | "complete" | "error";
  total: number;
  processed: number;
  totalSites: number;
  processedSites: number;
  currentSiteName?: string;
  currentPageName?: string;
  error?: string;
}

export interface SiteSummary {
  siteId: string;
  siteName: string;
  displayName: string;
  pageCount: number;
  analyzedCount: number;
  failedCount: number;
  averageScore: number;
  scoreDistribution: {
    good: number;
    needsWork: number;
    significant: number;
    notReady: number;
  };
}

export interface SiteAnalysisSummary {
  totalSites: number;
  totalPages: number;
  analyzedPages: number;
  failedPages: number;
  averageScore: number;
  scoreDistribution: {
    good: number;
    needsWork: number;
    significant: number;
    notReady: number;
  };
  sites: SiteSummary[];
  topCategories: {
    category: AnalysisCategory;
    label: string;
    averageScore: number;
    maxScore: number;
    failCount: number;
  }[];
  worstPages: SitePageSummary[];
  bestPages: SitePageSummary[];
}