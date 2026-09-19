"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMarketplaceClient } from "@/src/utils/hooks/useMarketplaceClient";
import type {
  AnalysisResult,
  CrawlerStatus,
  PageContext,
  PageInfo,
  SiteInfo,
} from "@/src/types/analysis";
import ScoreCard from "./ScoreCard";
import CategoryCard from "./CategoryCard";
import DiagnosticCard from "./DiagnosticCard";
import StaleBanner from "./StaleBanner";
import CopyButton from "./CopyButton";
import ErrorBanner from "./ErrorBanner";

/** How long to wait after a page change before first getPageHTML() call. */
const SETTLE_MS = 1500;
/** Max wait for the canvas to actually change. */
const MAX_WAIT_MS = 8000;
/** Interval between retries while waiting for the canvas. */
const RETRY_INTERVAL_MS = 500;

function resolveSiteOrigin(
  siteInfo: SiteInfo | null,
  pageInfo: PageInfo | null
): string | null {
  if (siteInfo?.targetHostname) {
    const scheme = siteInfo.scheme ?? "https";
    try {
      const url = new URL(`${scheme}://${siteInfo.targetHostname}`);
      if (url.protocol === "http:" || url.protocol === "https:") {
        return url.origin;
      }
    } catch {
      /* fall through */
    }
  }
  if (pageInfo?.url) {
    try {
      const url = new URL(pageInfo.url);
      if (url.protocol === "http:" || url.protocol === "https:") {
        return url.origin;
      }
    } catch {
      /* fall through */
    }
  }
  return null;
}

function buildReport(result: AnalysisResult, page: PageInfo | null): string {
  const lines: string[] = [];
  lines.push("SitecoreAI Answer Readiness");
  lines.push("");
  if (page) {
    lines.push(`Page: ${page.displayName ?? page.name ?? "Untitled"}`);
    if (page.path) lines.push(`Path: ${page.path}`);
    lines.push("");
  }
  if (result.mode === "scored" && result.score !== null) {
    lines.push(`Score: ${result.score}/100`);
  } else {
    lines.push("Status: Not enough content to score");
  }
  lines.push("");

  if (result.mode === "diagnostic") {
    lines.push("Missing signals:");
    for (const d of result.diagnostics) lines.push(`  - ${d}`);
    lines.push("");
  }

  for (const cat of result.categories) {
    lines.push(`${cat.label}: ${cat.score}/${cat.maxScore}`);
    const actionable = cat.findings.filter((f) => f.severity !== "pass");
    for (const f of actionable) {
      lines.push(`  [${f.severity.toUpperCase()}] ${f.title}`);
      lines.push(`    ${f.description}`);
      lines.push(`    Fix: ${f.recommendation}`);
    }
    lines.push("");
  }

  lines.push(`Analyzed: ${new Date(result.analyzedAt).toLocaleString()}`);
  return lines.join("\n");
}

export default function AnswerReadinessPanel() {
  const { client, error: clientError, isInitialized } = useMarketplaceClient();
  const [page, setPage] = useState<PageInfo | null>(null);
  const [site, setSite] = useState<SiteInfo | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [resultPageId, setResultPageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [contentEditedSinceAnalysis, setContentEditedSinceAnalysis] = useState(false);

  const activePageIdRef = useRef<string | null>(null);
  const analyzeAbortRef = useRef<AbortController | null>(null);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousHtmlRef = useRef<string>("");
  const resultPageIdRef = useRef<string | null>(null);
  const analyzeRef = useRef<() => Promise<void>>(async () => {});
  const pageRef = useRef<PageInfo | null>(null);
  const siteRef = useRef<SiteInfo | null>(null);

  // Keep refs in sync with state so the coordination effect never needs to re-run.
  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  useEffect(() => {
    siteRef.current = site;
  }, [site]);

  useEffect(() => {
    resultPageIdRef.current = resultPageId;
  }, [resultPageId]);

  /**
   * Wait for the canvas to reflect the new page.
   * Repeatedly calls getPageHTML() until the HTML differs from the previous page's HTML,
   * or until the max wait time elapses.
   */
  const waitForCanvasUpdate = useCallback(
    async (
      sdk: { getPageHTML?: () => Promise<string> },
      previousHtml: string,
      signal: AbortSignal
    ): Promise<string | null> => {
      const started = Date.now();
      while (Date.now() - started < MAX_WAIT_MS) {
        if (signal.aborted) return null;
        try {
          const html = await sdk.getPageHTML!();
          if (signal.aborted) return null;
          if (!previousHtml || html !== previousHtml) {
            return html;
          }
        } catch {
          /* retry */
        }
        await new Promise((r) => setTimeout(r, RETRY_INTERVAL_MS));
      }
      try {
        return (await sdk.getPageHTML!()) ?? null;
      } catch {
        return null;
      }
    },
    []
  );

  const analyze = useCallback(async () => {
    const currentPage = pageRef.current;
    const currentSite = siteRef.current;
    const pageId = currentPage?.id ?? currentPage?.itemId;
    if (!client || !pageId) return;

    analyzeAbortRef.current?.abort();
    const controller = new AbortController();
    analyzeAbortRef.current = controller;

    const analyzedId = pageId;
    setLoading(true);
    setMessage(null);
    setContentEditedSinceAnalysis(false);

    try {
      const sdk = client as unknown as { getPageHTML?: () => Promise<string> };
      if (typeof sdk.getPageHTML !== "function") {
        setMessage("Rendered HTML inspection is not available in this environment.");
        return;
      }

      const html = await waitForCanvasUpdate(sdk, previousHtmlRef.current, controller.signal);

      if (controller.signal.aborted) return;
      if (activePageIdRef.current !== analyzedId) return;

      if (!html) {
        setMessage("The current page did not return rendered HTML.");
        return;
      }

      previousHtmlRef.current = html;

      const siteOrigin = resolveSiteOrigin(currentSite, currentPage);
      let crawler: CrawlerStatus | null = null;
      if (siteOrigin) {
        try {
          const res = await fetch("/api/crawler-check", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ siteUrl: siteOrigin }),
            signal: controller.signal,
          });
          if (res.ok) {
            const data = (await res.json()) as CrawlerStatus;
            if (data.checked) crawler = data;
          }
        } catch {
          /* best-effort */
        }
      }

      if (controller.signal.aborted) return;
      if (activePageIdRef.current !== analyzedId) return;

      const analysisRes = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          html,
          pageId: analyzedId,
          language: currentPage?.language,
          crawlerStatus: crawler ?? undefined,
        }),
        signal: controller.signal,
      });

      if (!analysisRes.ok) throw new Error("The analysis service could not process the page.");
      const next = (await analysisRes.json()) as AnalysisResult;

      if (controller.signal.aborted) return;
      if (activePageIdRef.current !== analyzedId) return;

      setResult(next);
      setResultPageId(analyzedId);
    } catch (e) {
      if (controller.signal.aborted) return;
      if (activePageIdRef.current !== analyzedId) return;
      setMessage(e instanceof Error ? e.message : "Analysis failed.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [client, waitForCanvasUpdate]);

  // Keep analyzeRef in sync so the coordination effect can call the latest analyze
  // without listing it as a dependency.
  useEffect(() => {
    analyzeRef.current = analyze;
  }, [analyze]);

  // Main coordination effect — subscribe ONCE. Never re-runs on state change.
  useEffect(() => {
    if (!isInitialized || !client) return;
    let cancelled = false;
    let unsubscribeContext: (() => void) | undefined;
    let unsubscribeFields: (() => void) | undefined;

    const handlePageContext = (raw: unknown) => {
      const ctx = raw as PageContext | undefined;
      const pageInfo = ctx?.pageInfo ?? null;
      const siteInfo = ctx?.siteInfo ?? null;

      if (siteInfo) setSite(siteInfo);
      if (!pageInfo) return;

      const nextId = pageInfo.id ?? pageInfo.itemId ?? null;
      if (!nextId) return;

      setPage(pageInfo);

      if (activePageIdRef.current !== nextId) {
        analyzeAbortRef.current?.abort();
        if (settleTimerRef.current) clearTimeout(settleTimerRef.current);

        setResult(null);
        setResultPageId(null);
        setMessage(null);
        setLoading(false);
        setContentEditedSinceAnalysis(false);

        previousHtmlRef.current = "";
        activePageIdRef.current = nextId;

        settleTimerRef.current = setTimeout(() => {
          if (cancelled) return;
          if (activePageIdRef.current !== nextId) return;
          void analyzeRef.current();
        }, SETTLE_MS);
      }
    };

    const initialize = async () => {
      try {
        await client.query("application.context");
        if (cancelled) return;

        const contextResponse = await client.query("pages.context", {
          subscribe: true,
          onSuccess: (context) => {
            if (!cancelled) handlePageContext(context);
          },
        });
        const contextEnvelope = contextResponse as unknown as {
          unsubscribe?: () => void;
          data?: PageContext;
        };
        unsubscribeContext = contextEnvelope.unsubscribe ?? null;

        if (contextEnvelope.data && activePageIdRef.current === null) {
          handlePageContext(contextEnvelope.data);
        }

        unsubscribeFields = client.subscribe("pages.content.fieldsUpdated", {
          onData: () => {
            if (cancelled) return;
            if (
              resultPageIdRef.current &&
              activePageIdRef.current === resultPageIdRef.current
            ) {
              setContentEditedSinceAnalysis(true);
            }
          },
          onError: (err) => console.error("Fields subscription error:", err),
        });
      } catch (e) {
        if (!cancelled) setMessage(e instanceof Error ? e.message : "Context load failed.");
      }
    };

    void initialize();

    return () => {
      cancelled = true;
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
      unsubscribeContext?.();
      unsubscribeFields?.();
      analyzeAbortRef.current?.abort();
      analyzeAbortRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, isInitialized]);

  // Keyboard shortcut: R to re-analyze
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "r" && e.key !== "R") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        return;
      }
      if (loading) return;
      e.preventDefault();
      void analyzeRef.current();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [loading]);

  if (clientError) {
    return (
      <div className="min-h-full bg-slate-50 p-4">
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
          Marketplace SDK initialization failed: {clientError.message}
        </div>
      </div>
    );
  }

  const pageId = page?.id ?? page?.itemId;
  const resultsAreCurrent = result !== null && resultPageId !== null && resultPageId === pageId;
  const canAnalyze = Boolean(isInitialized && client && pageId && !loading);

  return (
    <div className="flex min-h-full flex-col gap-3 bg-slate-50 p-3.5">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            SitecoreAI
          </div>
          <h1 className="mt-0.5 text-[17px] font-semibold leading-tight text-slate-900">
            Answer Readiness
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-medium text-slate-600">
            AEO / GEO
          </span>
          <button
            type="button"
            onClick={() => void analyzeRef.current()}
            disabled={!canAnalyze}
            title="Re-analyze page (R)"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? (
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
            ) : (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3.5 w-3.5"
              >
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                <path d="M3 21v-5h5" />
              </svg>
            )}
          </button>
        </div>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
          Current page
        </div>
        {page ? (
          <div className="mt-1 space-y-0.5">
            <div className="truncate text-[12.5px] font-semibold text-slate-900">
              {page.displayName ?? page.name ?? "Untitled page"}
            </div>
            {page.path && (
              <div className="truncate text-[10px] text-slate-500">{page.path}</div>
            )}
          </div>
        ) : (
          <div className="mt-2 space-y-1.5">
            <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
            <div className="h-2.5 w-1/2 animate-pulse rounded bg-slate-100" />
          </div>
        )}
      </section>

      {loading && !resultsAreCurrent && (
        <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
            <span className="text-[11px] font-medium text-slate-600">
              Analyzing page…
            </span>
          </div>
        </section>
      )}

      {message && <ErrorBanner message={message} onRetry={() => void analyzeRef.current()} />}

      {resultsAreCurrent && result.mode === "diagnostic" && (
        <DiagnosticCard
          result={result}
          onReanalyze={() => void analyzeRef.current()}
          loading={loading}
        />
      )}

      {resultsAreCurrent && result.mode === "scored" && (
        <>
          <ScoreCard result={result} />

          {(contentEditedSinceAnalysis ||
            Date.now() - new Date(result.analyzedAt).getTime() > 300000) && (
            <StaleBanner
              analyzedAt={result.analyzedAt}
              onReanalyze={() => void analyzeRef.current()}
              edited={contentEditedSinceAnalysis}
            />
          )}

          {result.categories.map((category) => (
            <CategoryCard key={category.category} category={category} />
          ))}

          <div className="flex items-center justify-between gap-2">
            <p className="text-[9.5px] leading-relaxed text-slate-400">
              {result.source.wordCount} words · {result.source.headingCount} headings ·{" "}
              {result.source.paragraphCount} paragraphs
            </p>
            <CopyButton text={buildReport(result, page)} />
          </div>
        </>
      )}
    </div>
  );
}