"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMarketplaceClient } from "@/src/utils/hooks/useMarketplaceClient";
import { extractHtmlSignals } from "@/src/lib/analysis/html";
import { runRules } from "@/src/lib/analysis/rules";
import { calculateResult } from "@/src/lib/analysis/score";
import type { AnalysisResult } from "@/src/types/analysis";
import SitePageTree, { NormalizedPage } from "./SitePageTree";
import SiteReportView from "./SiteReportView";
import SiteWelcomePanel from "./SiteWelcomePanel";
import SiteLoadingState from "./SiteLoadingState";
import SiteErrorState from "./SiteErrorState";
import HelpModal from "@/src/components/HelpModal";

interface RawSite {
  id: string;
  name: string;
  displayName?: string;
  supportedLanguages?: string[];
  languages?: string[];
}

interface RawAgentPage {
  id?: string;
  itemId?: string;
  path?: string;
  name?: string;
  displayName?: string;
}

export interface PageReport {
  page: NormalizedPage;
  result: AnalysisResult;
  language: string;
}

export interface PageScoreEntry {
  score: number | null;
  mode: "scored" | "diagnostic";
  criticalCount: number;
  issueCount: number;
}

const EXCLUDED_PATH_SEGMENTS = [
  "/Data/",
  "/Settings/",
  "/Presentation/",
  "/Templates/",
  "/Media/",
  "/System/",
];

function isNavigationPage(path: string): boolean {
  if (!path) return false;
  const normalized = path.endsWith("/") ? path : path + "/";
  return !EXCLUDED_PATH_SEGMENTS.some((seg) => normalized.includes(seg));
}

function resolveLanguages(site: RawSite | null): string[] {
  if (!site) return ["en"];
  const langs = site.supportedLanguages ?? site.languages ?? ["en"];
  return [...langs].sort((a, b) => {
    if (a.toLowerCase() === "en") return -1;
    if (b.toLowerCase() === "en") return 1;
    return a.localeCompare(b);
  });
}

function formatGuid(id: string): string {
  if (!id) return "";
  if (id.includes("-")) return id;
  if (id.length === 32) {
    return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;
  }
  return id;
}

function extractAgentPageArray(raw: unknown, depth = 0): RawAgentPage[] {
  if (depth > 6) return [];
  if (!raw) return [];
  if (Array.isArray(raw)) {
    const first = raw[0];
    if (!first || typeof first !== "object") return [];
    const obj = first as Record<string, unknown>;
    if ("id" in obj || "itemId" in obj || "path" in obj) {
      return raw as RawAgentPage[];
    }
    return [];
  }
  if (typeof raw !== "object") return [];
  const obj = raw as Record<string, unknown>;
  for (const key of ["pages", "results", "items", "data"]) {
    if (Array.isArray(obj[key])) {
      const found = extractAgentPageArray(obj[key], depth + 1);
      if (found.length > 0) return found;
    }
  }
  for (const value of Object.values(obj)) {
    if (value && typeof value === "object") {
      const found = extractAgentPageArray(value, depth + 1);
      if (found.length > 0) return found;
    }
  }
  return [];
}

function normalizeAgentPage(raw: RawAgentPage): NormalizedPage | null {
  const rawId = raw.itemId ?? raw.id ?? "";
  if (!rawId) return null;
  const path = raw.path ?? "";
  if (!path) return null;
  if (!isNavigationPage(path)) return null;
  const trimmed = path.replace(/\/$/, "");
  const segments = trimmed.split("/").filter(Boolean);
  const fallbackName = segments.length > 0 ? segments[segments.length - 1] : "Home";
  const name = (raw.name ?? raw.displayName ?? "").trim() || fallbackName;
  return { itemId: formatGuid(rawId), path, name, depth: 0, children: [] };
}

function extractHtml(raw: unknown, depth = 0): string | null {
  if (depth > 6) return null;
  if (typeof raw === "string" && raw.length > 0) return raw;
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  for (const key of ["html", "content", "body"]) {
    if (typeof obj[key] === "string" && (obj[key] as string).length > 0) {
      return obj[key] as string;
    }
  }
  for (const value of Object.values(obj)) {
    if (value && typeof value === "object") {
      const found = extractHtml(value, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

type View = "tree" | "priority";

export default function SiteAnalysisView() {
  const { client, error: clientError, isInitialized } = useMarketplaceClient();

  const [sites, setSites] = useState<RawSite[]>([]);
  const [selectedSiteName, setSelectedSiteName] = useState<string>("");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [sitecoreContextId, setSitecoreContextId] = useState<string | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);

  const [pages, setPages] = useState<NormalizedPage[]>([]);
  const [pagesLoading, setPagesLoading] = useState(false);
  const [pagesError, setPagesError] = useState<string | null>(null);

  const [selectedPage, setSelectedPage] = useState<NormalizedPage | null>(null);
  const [report, setReport] = useState<PageReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const [scoreByPageId, setScoreByPageId] = useState<Map<string, PageScoreEntry>>(new Map());
  const [view, setView] = useState<View>("tree");
  const [helpOpen, setHelpOpen] = useState(false);

  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ done: 0, total: 0, current: "" });
  const batchCancelRef = useRef(false);

  const selectedSite = sites.find((s) => s.name === selectedSiteName) ?? null;
  const availableLanguages = resolveLanguages(selectedSite);

  const flatPages = useMemo(() => {
    const out: NormalizedPage[] = [];
    const walk = (node: NormalizedPage) => {
      out.push(node);
      node.children.forEach(walk);
    };
    if (pages.length > 0) walk(pages[0]);
    return out;
  }, [pages]);

  const siteStats = useMemo(() => {
    const analyzed = Array.from(scoreByPageId.values()).filter(
      (s) => s.mode === "scored" && s.score !== null
    );
    const total = flatPages.length;
    const analyzedCount = analyzed.length;
    const unanalyzed = Math.max(0, total - analyzedCount);

    const siteAverage =
      analyzed.length > 0
        ? Math.round(
            analyzed.reduce((sum, s) => sum + (s.score ?? 0), 0) / analyzed.length
          )
        : null;

    const criticalPages = analyzed.filter((s) => s.criticalCount > 0).length;
    const needsImprovement = analyzed.filter((s) => (s.score ?? 0) < 60).length;

    const distribution = {
      good: analyzed.filter((s) => (s.score ?? 0) >= 80).length,
      needsWork: analyzed.filter(
        (s) => (s.score ?? 0) >= 60 && (s.score ?? 0) < 80
      ).length,
      significant: analyzed.filter(
        (s) => (s.score ?? 0) >= 35 && (s.score ?? 0) < 60
      ).length,
      notReady: analyzed.filter((s) => (s.score ?? 0) < 35).length,
    };

    return {
      total,
      analyzedCount,
      unanalyzed,
      siteAverage,
      criticalPages,
      needsImprovement,
      distribution,
    };
  }, [scoreByPageId, flatPages]);

  const priorityPages = useMemo(() => {
    return flatPages
      .map((page) => {
        const entry = scoreByPageId.get(page.itemId);
        return { page, entry };
      })
      .filter(({ entry }) => entry && entry.mode === "scored" && entry.score !== null)
      .sort((a, b) => {
        const sa = a.entry?.score ?? 100;
        const sb = b.entry?.score ?? 100;
        return sa - sb;
      })
      .slice(0, 10);
  }, [flatPages, scoreByPageId]);

  useEffect(() => {
    if (!isInitialized || !client || bootstrapped) return;
    let cancelled = false;

    const bootstrap = async () => {
      try {
        const appRes = await client.query("application.context");
        const appData = (appRes as { data?: unknown }).data ?? appRes;
        const access = (appData as {
          resourceAccess?: Array<{ context?: { live?: string } }>;
        }).resourceAccess;
        const ctxId = access?.[0]?.context?.live;
        if (!ctxId) throw new Error("Sitecore context ID unavailable.");
        if (cancelled) return;
        setSitecoreContextId(ctxId);

        const sitesRes = await client.query("xmc.sites.listSites", {
          params: { query: { sitecoreContextId: ctxId } },
        });
        const sitesData = (sitesRes as { data?: unknown }).data ?? sitesRes;
        const rawSites = Array.isArray(sitesData)
          ? sitesData
          : (sitesData as { data?: unknown[] }).data ?? [];
        const loadedSites = rawSites as RawSite[];

        if (cancelled) return;
        if (loadedSites.length === 0) {
          throw new Error("No sites available in this environment.");
        }

        setSites(loadedSites);
        const firstSite = loadedSites[0];
        setSelectedSiteName(firstSite.name);
        setSelectedLanguage(resolveLanguages(firstSite)[0] ?? "en");
        setBootstrapped(true);
      } catch (e) {
        if (!cancelled) {
          setPagesError(e instanceof Error ? e.message : "Failed to load sites.");
          setBootstrapped(true);
        }
      }
    };

    void bootstrap();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, isInitialized]);

  useEffect(() => {
    if (!selectedSite) return;
    const langs = resolveLanguages(selectedSite);
    if (!langs.includes(selectedLanguage)) setSelectedLanguage(langs[0] ?? "en");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSite, selectedLanguage]);

  useEffect(() => {
    if (!client || !sitecoreContextId || !selectedSiteName || !selectedLanguage) return;
    let cancelled = false;
    setPagesLoading(true);
    setPagesError(null);
    setPages([]);
    setSelectedPage(null);
    setReport(null);
    setScoreByPageId(new Map());

    const load = async () => {
      try {
        const res = await client.query("xmc.agent.sitesGetAllPagesBySite", {
          params: {
            path: { siteName: selectedSiteName },
            query: { sitecoreContextId, language: selectedLanguage },
          },
        });
        if (cancelled) return;
        const rawPages = extractAgentPageArray(res);
        const normalized = rawPages
          .map((p) => normalizeAgentPage(p))
          .filter((p): p is NormalizedPage => p !== null);
        if (normalized.length === 0) {
          setPages([]);
          return;
        }
        setPages(buildPageTree(normalized));
      } catch (e) {
        if (!cancelled) {
          setPagesError(e instanceof Error ? e.message : "Failed to load pages.");
        }
      } finally {
        if (!cancelled) setPagesLoading(false);
      }
    };

    void load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, sitecoreContextId, selectedSiteName, selectedLanguage]);

  const analyzePage = useCallback(
    async (page: NormalizedPage) => {
      if (!client || !sitecoreContextId) return;
      setSelectedPage(page);
      setReportLoading(true);
      setReport(null);
      setReportError(null);

      try {
        const htmlRes = await client.query("xmc.agent.pagesGetPageHtml", {
          params: {
            path: { pageId: page.itemId },
            query: { sitecoreContextId, language: selectedLanguage },
          },
        });
        const html = extractHtml(htmlRes);
        if (!html) {
          setReportError("The page did not return rendered HTML.");
          return;
        }
        const signals = extractHtmlSignals(html);
        const rules = runRules(signals);
        const result = calculateResult(rules, signals, page.itemId, selectedLanguage);

        setReport({ page, result, language: selectedLanguage });

        const criticalCount = result.findings.filter((f) => f.severity === "error").length;
        const issueCount = result.findings.filter(
          (f) => f.severity === "error" || f.severity === "warning"
        ).length;

        setScoreByPageId((prev) => {
          const next = new Map(prev);
          next.set(page.itemId, {
            score: result.score,
            mode: result.mode,
            criticalCount,
            issueCount,
          });
          return next;
        });
      } catch (e) {
        setReportError(e instanceof Error ? e.message : "Analysis failed.");
      } finally {
        setReportLoading(false);
      }
    },
    [client, sitecoreContextId, selectedLanguage]
  );

  const runBatchAnalysis = useCallback(async () => {
    if (!client || !sitecoreContextId || batchRunning) return;
    batchCancelRef.current = false;
    setBatchRunning(true);
    setBatchProgress({ done: 0, total: flatPages.length, current: "" });

    for (let i = 0; i < flatPages.length; i++) {
      if (batchCancelRef.current) break;
      const page = flatPages[i];
      if (scoreByPageId.has(page.itemId)) {
        setBatchProgress({
          done: i + 1,
          total: flatPages.length,
          current: page.name,
        });
        continue;
      }
      setBatchProgress({
        done: i,
        total: flatPages.length,
        current: page.name,
      });
      try {
        const htmlRes = await client.query("xmc.agent.pagesGetPageHtml", {
          params: {
            path: { pageId: page.itemId },
            query: { sitecoreContextId, language: selectedLanguage },
          },
        });
        const html = extractHtml(htmlRes);
        if (html) {
          const signals = extractHtmlSignals(html);
          const rules = runRules(signals);
          const result = calculateResult(rules, signals, page.itemId, selectedLanguage);
          const criticalCount = result.findings.filter((f) => f.severity === "error").length;
          const issueCount = result.findings.filter(
            (f) => f.severity === "error" || f.severity === "warning"
          ).length;
          setScoreByPageId((prev) => {
            const next = new Map(prev);
            next.set(page.itemId, {
              score: result.score,
              mode: result.mode,
              criticalCount,
              issueCount,
            });
            return next;
          });
        }
      } catch {
        // Continue on failure.
      }
      setBatchProgress({
        done: i + 1,
        total: flatPages.length,
        current: page.name,
      });
    }

    setBatchRunning(false);
    batchCancelRef.current = false;
  }, [client, sitecoreContextId, selectedLanguage, flatPages, scoreByPageId, batchRunning]);

  const cancelBatch = useCallback(() => {
    batchCancelRef.current = true;
  }, []);

  const goPrev = useCallback(() => {
    if (!selectedPage) return;
    const idx = flatPages.findIndex((p) => p.path === selectedPage.path);
    if (idx > 0) analyzePage(flatPages[idx - 1]);
  }, [selectedPage, flatPages, analyzePage]);

  const goNext = useCallback(() => {
    if (!selectedPage) return;
    const idx = flatPages.findIndex((p) => p.path === selectedPage.path);
    if (idx >= 0 && idx < flatPages.length - 1) analyzePage(flatPages[idx + 1]);
  }, [selectedPage, flatPages, analyzePage]);

  const currentIndex = useMemo(() => {
    if (!selectedPage) return -1;
    return flatPages.findIndex((p) => p.path === selectedPage.path);
  }, [flatPages, selectedPage]);

  if (clientError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-8">
        <div className="max-w-md rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Marketplace SDK initialization failed: {clientError.message}
        </div>
      </div>
    );
  }

  if (!isInitialized) return <SiteLoadingState message="Initializing…" />;

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="flex w-full flex-wrap items-center justify-between gap-3 px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600">
              AEO / GEO
            </span>

            <div className="flex items-center gap-1.5">
              <select
                value={selectedSiteName}
                onChange={(e) => setSelectedSiteName(e.target.value)}
                disabled={sites.length === 0 || pagesLoading}
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 outline-none focus:border-slate-400 disabled:opacity-50"
              >
                {sites.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.displayName ?? s.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                disabled={availableLanguages.length === 0 || pagesLoading}
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 outline-none focus:border-slate-400 disabled:opacity-50"
              >
                {availableLanguages.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              title="How this score is calculated"
              aria-label="How this score is calculated"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              ?
            </button>

            {flatPages.length > 0 && (
              <button
                type="button"
                onClick={runBatchAnalysis}
                disabled={batchRunning}
                className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {batchRunning ? (
                  <>
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
                    {batchProgress.done}/{batchProgress.total}
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                      <path d="M21 3v5h-5" />
                      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                      <path d="M3 21v-5h5" />
                    </svg>
                    Analyze all
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {batchRunning && (
          <div className="border-t border-slate-100 bg-slate-50/60 px-6 py-2">
            <div className="flex items-center gap-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-slate-900 transition-all"
                  style={{
                    width: `${
                      batchProgress.total > 0
                        ? Math.round((batchProgress.done / batchProgress.total) * 100)
                        : 0
                    }%`,
                  }}
                />
              </div>
              <span className="shrink-0 text-[11px] text-slate-500">
                {batchProgress.done} of {batchProgress.total}
                {batchProgress.current && (
                  <span className="ml-1 text-slate-400">
                    · {batchProgress.current}
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={cancelBatch}
                className="shrink-0 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10.5px] font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </header>

      {pages.length > 0 && (
        <section className="border-b border-slate-200 bg-white">
          <div className="flex w-full flex-wrap items-center gap-x-6 gap-y-3 px-6 py-3">
            <Metric
              label="Analyzed"
              value={`${siteStats.analyzedCount}/${siteStats.total}`}
              sub={siteStats.unanalyzed > 0 ? `${siteStats.unanalyzed} remaining` : undefined}
            />
            <Divider />
            <Metric
              label="Site average"
              value={siteStats.siteAverage !== null ? `${siteStats.siteAverage}/100` : "—"}
              valueClass={scoreTone(siteStats.siteAverage)}
            />
            <Divider />
            <Metric
              label="With critical errors"
              value={String(siteStats.criticalPages)}
              valueClass={siteStats.criticalPages > 0 ? "text-red-700" : "text-slate-900"}
            />
            <Divider />
            <Metric
              label="Below 60"
              value={String(siteStats.needsImprovement)}
              valueClass={siteStats.needsImprovement > 0 ? "text-amber-700" : "text-slate-900"}
            />
            <Divider />
            <div className="flex items-center gap-1">
              {(["good", "needsWork", "significant", "notReady"] as const).map((k) => {
                const count = siteStats.distribution[k];
                const color =
                  k === "good"
                    ? "bg-emerald-500"
                    : k === "needsWork"
                    ? "bg-amber-500"
                    : k === "significant"
                    ? "bg-orange-500"
                    : "bg-red-500";
                return (
                  <span
                    key={k}
                    className={`inline-block h-3 w-3 rounded-sm ${color}`}
                    title={`${count} pages`}
                  />
                );
              })}
              <span className="ml-1 text-[11px] text-slate-500">distribution</span>
            </div>

            <div className="ml-auto flex items-center gap-1 rounded-md bg-slate-100 p-0.5">
              <button
                type="button"
                onClick={() => setView("tree")}
                className={`rounded px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                  view === "tree"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Pages
              </button>
              <button
                type="button"
                onClick={() => setView("priority")}
                className={`rounded px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                  view === "priority"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Priority
              </button>
            </div>
          </div>
        </section>
      )}

      <div className="flex flex-1 overflow-hidden">
        {view === "tree" && (
          <aside className="flex w-72 shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-2.5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                Pages
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-2 py-2">
              {pagesLoading && (
                <div className="flex items-center gap-2 px-2 py-3 text-[11.5px] text-slate-500">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
                  Loading pages…
                </div>
              )}
              {!pagesLoading && pagesError && (
                <div className="px-2 py-3 text-[11.5px] text-red-700">{pagesError}</div>
              )}
              {!pagesLoading && !pagesError && pages.length > 0 && (
                <SitePageTree
                  root={pages[0]}
                  selectedPath={selectedPage?.path ?? null}
                  scoreByPageId={scoreByPageId}
                  onSelect={analyzePage}
                />
              )}
            </div>
          </aside>
        )}

        {view === "priority" && (
          <aside className="flex w-96 shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                Priority improvements
              </div>
              <div className="mt-0.5 text-[10.5px] text-slate-400">
                Ranked by score. Analyze pages to populate.
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {priorityPages.length === 0 && (
                <div className="px-4 py-4 text-[11.5px] text-slate-500">
                  No pages analyzed yet. Click a page in the tree or use
                  Analyze all.
                </div>
              )}
              <ul className="divide-y divide-slate-100">
                {priorityPages.map(({ page, entry }, index) => (
                  <li key={page.itemId}>
                    <button
                      type="button"
                      onClick={() => analyzePage(page)}
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${
                        selectedPage?.path === page.path ? "bg-slate-50" : ""
                      }`}
                    >
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10.5px] font-bold text-slate-600">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className="truncate text-[12px] font-semibold text-slate-900">
                            {page.name}
                          </span>
                          <span
                            className={`shrink-0 text-[12.5px] font-bold ${scoreTone(
                              entry?.score ?? null
                            )}`}
                          >
                            {entry?.score ?? "—"}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-[10.5px] text-slate-500">
                          {entry && entry.criticalCount > 0 && (
                            <span className="font-medium text-red-700">
                              {entry.criticalCount} critical
                            </span>
                          )}
                          {entry && entry.issueCount > 0 && (
                            <span>{entry.issueCount} issues</span>
                          )}
                          {entry && entry.issueCount === 0 && (
                            <span className="text-emerald-600">no issues</span>
                          )}
                        </div>
                        <div className="mt-1 truncate text-[10px] text-slate-400">
                          {page.path}
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        )}

        <main className="flex-1 overflow-y-auto">
          {!pagesLoading && !pagesError && pages.length === 0 && (
            <NoPagesState siteName={selectedSiteName} language={selectedLanguage} />
          )}

          {pages.length > 0 && !selectedPage && !reportLoading && <SiteWelcomePanel />}

          {reportLoading && <SiteReportSkeleton />}

          {!reportLoading && reportError && (
            <div className="mx-auto w-full max-w-5xl px-8 py-8">
              <SiteErrorState
                message={reportError}
                onRetry={() => selectedPage && analyzePage(selectedPage)}
              />
            </div>
          )}

          {!reportLoading && report && (
            <SiteReportView
              report={report}
              siteAverage={siteStats.siteAverage}
              flatPages={flatPages}
              currentIndex={currentIndex}
              onPrev={goPrev}
              onNext={goNext}
              onSelectPage={analyzePage}
              onOpenHelp={() => setHelpOpen(true)}
            />
          )}
        </main>
      </div>

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} result={report?.result ?? null} />
    </div>
  );
}

function Metric({
  label,
  value,
  sub,
  valueClass = "text-slate-900",
}: {
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-500">
        {label}
      </span>
      <div className="mt-0.5 flex items-baseline gap-1.5">
        <span className={`text-[15px] font-bold leading-none ${valueClass}`}>
          {value}
        </span>
        {sub && <span className="text-[10.5px] text-slate-400">{sub}</span>}
      </div>
    </div>
  );
}

function Divider() {
  return <span className="hidden h-6 w-px bg-slate-200 sm:inline-block" />;
}

function scoreTone(score: number | null) {
  if (score === null) return "text-slate-400";
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-amber-600";
  if (score >= 35) return "text-orange-600";
  return "text-red-600";
}

function NoPagesState({ siteName, language }: { siteName: string; language: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center py-24">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5 text-slate-400"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </div>
      <h2 className="mt-4 text-[14px] font-semibold text-slate-900">
        No pages in this site
      </h2>
      <p className="mt-1 max-w-md text-center text-[12px] leading-relaxed text-slate-500">
        The site <strong className="text-slate-700">{siteName}</strong> in
        language <strong className="text-slate-700">{language}</strong> does not
        expose any navigation pages. Publish pages in this language, or switch
        to a different site or language.
      </p>
    </div>
  );
}

function buildPageTree(pages: NormalizedPage[]): NormalizedPage[] {
  if (pages.length === 0) return [];
  const sorted = [...pages].sort((a, b) => a.path.localeCompare(b.path));
  const rootPath = sorted[0].path;
  const root: NormalizedPage = {
    itemId: sorted[0].itemId,
    path: sorted[0].path,
    name: sorted[0].name,
    depth: 0,
    children: [],
  };
  const lookup = new Map<string, NormalizedPage>();
  lookup.set(root.path, root);
  for (const page of sorted) {
    if (page.path === rootPath) continue;
    lookup.set(page.path, {
      itemId: page.itemId,
      path: page.path,
      name: page.name,
      depth: 0,
      children: [],
    });
  }
  for (const page of sorted) {
    if (page.path === rootPath) continue;
    const node = lookup.get(page.path);
    if (!node) continue;
    let parentPath = page.path;
    let parent: NormalizedPage | undefined;
    while (parentPath.includes("/")) {
      parentPath = parentPath.substring(0, parentPath.lastIndexOf("/"));
      const candidate = lookup.get(parentPath);
      if (candidate && candidate.path !== page.path) {
        parent = candidate;
        break;
      }
    }
    if (parent) {
      node.depth = parent.depth + 1;
      parent.children.push(node);
    } else {
      node.depth = 1;
      root.children.push(node);
    }
  }
  const sortChildren = (node: NormalizedPage) => {
    node.children.sort((a, b) => a.name.localeCompare(b.name));
    node.children.forEach(sortChildren);
  };
  sortChildren(root);
  return [root];
}

function SiteReportSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-8 py-8">
      <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-6">
        <div className="h-6 w-40 rounded bg-slate-200" />
        <div className="mt-2 h-3 w-64 rounded bg-slate-100" />
        <div className="mt-6 flex gap-4">
          <div className="h-3 w-32 rounded bg-slate-100" />
          <div className="h-3 w-24 rounded bg-slate-100" />
          <div className="h-3 w-40 rounded bg-slate-100" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="animate-pulse rounded-xl border border-slate-200 bg-white p-4">
            <div className="h-3 w-20 rounded bg-slate-100" />
            <div className="mt-3 h-1.5 w-full rounded bg-slate-100" />
            <div className="mt-3 h-3 w-full rounded bg-slate-100" />
            <div className="mt-1 h-3 w-2/3 rounded bg-slate-100" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse rounded-xl border border-slate-200 bg-white p-4">
            <div className="h-3 w-16 rounded bg-slate-100" />
            <div className="mt-3 h-1.5 w-full rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}