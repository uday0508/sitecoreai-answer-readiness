"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

  return {
    itemId: formatGuid(rawId),
    path,
    name,
    depth: 0,
    children: [],
  };
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

  const [scoreByPageId, setScoreByPageId] = useState<Map<string, PageScoreEntry>>(
    new Map()
  );

  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ done: 0, total: 0 });

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

  const siteAverage = useMemo(() => {
    const scored = Array.from(scoreByPageId.values()).filter(
      (s) => s.mode === "scored" && s.score !== null
    );
    if (scored.length < 3) return null;
    return Math.round(
      scored.reduce((sum, s) => sum + (s.score ?? 0), 0) / scored.length
    );
  }, [scoreByPageId]);

  const currentIndex = useMemo(() => {
    if (!selectedPage) return -1;
    return flatPages.findIndex((p) => p.path === selectedPage.path);
  }, [flatPages, selectedPage]);

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
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, isInitialized]);

  useEffect(() => {
    if (!selectedSite) return;
    const langs = resolveLanguages(selectedSite);
    if (!langs.includes(selectedLanguage)) {
      setSelectedLanguage(langs[0] ?? "en");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSite, selectedLanguage]);

  useEffect(() => {
    if (!client || !sitecoreContextId || !selectedSiteName || !selectedLanguage) {
      return;
    }

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
          setPagesError(
            `No navigation pages found for "${selectedSiteName}" in "${selectedLanguage}".`
          );
          return;
        }

        const tree = buildPageTree(normalized);
        setPages(tree);
      } catch (e) {
        if (!cancelled) {
          setPagesError(e instanceof Error ? e.message : "Failed to load pages.");
        }
      } finally {
        if (!cancelled) setPagesLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
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

        setScoreByPageId((prev) => {
          const next = new Map(prev);
          next.set(page.itemId, { score: result.score, mode: result.mode });
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

  const goPrev = useCallback(() => {
    if (currentIndex > 0) analyzePage(flatPages[currentIndex - 1]);
  }, [currentIndex, flatPages, analyzePage]);

  const goNext = useCallback(() => {
    if (currentIndex >= 0 && currentIndex < flatPages.length - 1) {
      analyzePage(flatPages[currentIndex + 1]);
    }
  }, [currentIndex, flatPages, analyzePage]);

  const runBatchAnalysis = useCallback(async () => {
    if (!client || !sitecoreContextId || batchRunning) return;
    setBatchRunning(true);
    setBatchProgress({ done: 0, total: flatPages.length });

    for (let i = 0; i < flatPages.length; i++) {
      const page = flatPages[i];
      if (scoreByPageId.has(page.itemId)) {
        setBatchProgress({ done: i + 1, total: flatPages.length });
        continue;
      }
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
          setScoreByPageId((prev) => {
            const next = new Map(prev);
            next.set(page.itemId, { score: result.score, mode: result.mode });
            return next;
          });
        }
      } catch {
        // Continue with the next page on failure.
      }
      setBatchProgress({ done: i + 1, total: flatPages.length });
    }

    setBatchRunning(false);
  }, [client, sitecoreContextId, selectedLanguage, flatPages, scoreByPageId, batchRunning]);

  const exportSiteReport = useCallback(() => {
    const lines: string[] = [];
    lines.push("# SitecoreAI Answer Readiness — Site Report");
    lines.push("");
    lines.push(`Site: ${selectedSiteName}`);
    lines.push(`Language: ${selectedLanguage}`);
    lines.push(`Pages: ${flatPages.length}`);
    lines.push(
      `Analyzed: ${Array.from(scoreByPageId.values()).filter((s) => s.score !== null).length}`
    );
    if (siteAverage !== null) {
      lines.push(`Site average: ${siteAverage}/100`);
    }
    lines.push(`Generated: ${new Date().toLocaleString()}`);
    lines.push("");
    lines.push("## Page scores");
    lines.push("");
    for (const page of flatPages) {
      const entry = scoreByPageId.get(page.itemId);
      const score = entry?.score ?? null;
      const label = score === null ? "not analyzed" : `${score}/100`;
      lines.push(`- ${page.path} — ${label}`);
    }
    lines.push("");

    return lines.join("\n");
  }, [selectedSiteName, selectedLanguage, flatPages, scoreByPageId, siteAverage]);

  const handleSiteExport = useCallback(() => {
    const text = exportSiteReport();
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedSiteName}-answer-readiness-site-report.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [exportSiteReport, selectedSiteName]);

  if (clientError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-8">
        <div className="max-w-md rounded-xl border border-red-200 bg-red-50 p-5 text-base text-red-800">
          Marketplace SDK initialization failed: {clientError.message}
        </div>
      </div>
    );
  }

  if (!isInitialized) {
    return <SiteLoadingState message="Initializing…" />;
  }

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="flex w-full flex-wrap items-center justify-between gap-4 px-8 py-4">
          <div className="flex items-center gap-5">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                SitecoreAI
              </div>
              <h1 className="text-xl font-semibold text-slate-900">
                Answer Readiness
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedSiteName}
                onChange={(e) => setSelectedSiteName(e.target.value)}
                disabled={sites.length === 0 || pagesLoading}
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 outline-none focus:border-slate-400 disabled:opacity-50"
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
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 outline-none focus:border-slate-400 disabled:opacity-50"
              >
                {availableLanguages.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {pages.length > 0 && (
              <div className="text-[13px] text-slate-500">
                {flatPages.length} page{flatPages.length === 1 ? "" : "s"}
                {siteAverage !== null && (
                  <>
                    {" · site avg "}
                    <span className="font-semibold text-slate-700">{siteAverage}</span>
                  </>
                )}
              </div>
            )}

            {flatPages.length > 0 && (
              <button
                type="button"
                onClick={runBatchAnalysis}
                disabled={batchRunning}
                className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3.5 py-1.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                title="Analyze every page so the tree dots and site average are populated"
              >
                {batchRunning ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
                    {batchProgress.done}/{batchProgress.total}
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
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

            {Array.from(scoreByPageId.values()).some((s) => s.score !== null) && (
              <button
                type="button"
                onClick={handleSiteExport}
                className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3.5 py-1.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50"
                title="Export the site-wide report"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <path d="M12 3v12" />
                  <path d="m7 10 5 5 5-5" />
                  <path d="M5 21h14" />
                </svg>
                Export site
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="flex w-80 shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              Pages
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-2 py-2.5">
            {pagesLoading && (
              <div className="flex items-center gap-2.5 px-3 py-3 text-[13px] text-slate-500">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
                Loading pages…
              </div>
            )}

            {!pagesLoading && pagesError && (
              <div className="px-3 py-3 text-[13px] text-red-700">{pagesError}</div>
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

        <main className="flex-1 overflow-y-auto">
          {!selectedPage && !reportLoading && <SiteWelcomePanel />}

          {reportLoading && <SiteReportSkeleton />}

          {!reportLoading && reportError && (
            <div className="mx-auto w-full max-w-6xl px-10 py-10">
              <SiteErrorState
                message={reportError}
                onRetry={() => selectedPage && analyzePage(selectedPage)}
              />
            </div>
          )}

          {!reportLoading && report && (
            <SiteReportView
              report={report}
              siteAverage={siteAverage}
              flatPages={flatPages}
              currentIndex={currentIndex}
              onPrev={goPrev}
              onNext={goNext}
              onSelectPage={analyzePage}
            />
          )}
        </main>
      </div>
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
    <div className="mx-auto w-full max-w-6xl space-y-7 px-10 py-10">
      <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-7">
        <div className="h-8 w-52 rounded bg-slate-200" />
        <div className="mt-3 h-4 w-80 rounded bg-slate-100" />
        <div className="mt-7 flex gap-5">
          <div className="h-4 w-40 rounded bg-slate-100" />
          <div className="h-4 w-32 rounded bg-slate-100" />
          <div className="h-4 w-52 rounded bg-slate-100" />
        </div>
      </div>
      <div className="grid grid-cols-5 gap-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-slate-200 bg-white p-5"
          >
            <div className="h-3.5 w-24 rounded bg-slate-100" />
            <div className="mt-4 h-2 w-full rounded bg-slate-100" />
            <div className="mt-4 h-4 w-full rounded bg-slate-100" />
            <div className="mt-1.5 h-4 w-2/3 rounded bg-slate-100" />
          </div>
        ))}
      </div>
      <div className="space-y-4">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-slate-200 bg-white p-6"
          >
            <div className="h-5 w-2/3 rounded bg-slate-200" />
            <div className="mt-4 h-4 w-full rounded bg-slate-100" />
            <div className="mt-1.5 h-4 w-4/5 rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}