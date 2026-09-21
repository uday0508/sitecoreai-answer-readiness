"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMarketplaceClient } from "@/src/utils/hooks/useMarketplaceClient";
import type {
  AnalysisResult,
  PageContext,
  PageInfo,
} from "@/src/types/analysis";
import ScoreCard from "./ScoreCard";
import CategoryCard from "./CategoryCard";
import DiagnosticCard from "./DiagnosticCard";
import PriorityCard from "./PriorityCard";
import Banner from "./Banner";
import CopyButton from "./CopyButton";
import EmptyState from "./EmptyState";
import HelpModal from "./HelpModal";

interface QueryEnvelope<T> {
  data?: T;
  unsubscribe?: () => void;
}

export type SeverityFilter = "all" | "error" | "warning" | "info" | "pass";

const HEADER_SCROLL_OFFSET = 190;

async function readPageHtml(
  client: unknown,
  pageId: string,
  language: string | undefined,
  sitecoreContextId: string
): Promise<string | null> {
  try {
    const res = await (
      client as {
        query: (
          name: string,
          options: {
            params: {
              path: Record<string, unknown>;
              query: Record<string, unknown>;
            };
          }
        ) => Promise<unknown>;
      }
    ).query("xmc.agent.pagesGetPageHtml", {
      params: {
        path: { pageId },
        query: { sitecoreContextId, language },
      },
    });
    return extractHtml(res);
  } catch {
    return null;
  }
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

function buildReport(result: AnalysisResult, page: PageInfo | null): string {
  const lines: string[] = [];
  lines.push("SitecoreAI Answer Readiness");
  lines.push("");
  if (page) {
    lines.push(`Page: ${page.displayName ?? page.name ?? "Untitled"}`);
    if (page.path) lines.push(`Path: ${page.path}`);
    lines.push("");
  }
  lines.push(
    result.mode === "scored" && result.score !== null
      ? `Score: ${result.score}/100`
      : "Status: Not enough content to score"
  );
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

function buildSummaryReport(
  result: AnalysisResult,
  page: PageInfo | null
): string {
  const lines: string[] = [];
  lines.push(
    `Answer Readiness — ${page?.displayName ?? page?.name ?? "Untitled"}`
  );
  lines.push(
    result.mode === "scored" && result.score !== null
      ? `Score: ${result.score}/100`
      : "Status: Not enough content to score"
  );
  const top = result.findings
    .filter((f) => f.severity === "error" || f.severity === "warning")
    .sort((a, b) => b.scoreImpact - a.scoreImpact)
    .slice(0, 5);
  if (top.length > 0) {
    lines.push("");
    lines.push("Top fixes:");
    top.forEach((f, i) => {
      lines.push(`${i + 1}. ${f.title}`);
      lines.push(`   ${f.recommendation}`);
    });
  }
  return lines.join("\n");
}

function buildChecklist(result: AnalysisResult): string {
  const lines: string[] = ["# Answer Readiness Fixes", ""];
  for (const cat of result.categories) {
    const actionable = cat.findings.filter(
      (f) => f.severity === "error" || f.severity === "warning"
    );
    if (actionable.length === 0) continue;
    lines.push(`## ${cat.label}`);
    for (const f of actionable) {
      lines.push(`- [ ] ${f.title}`);
      lines.push(`      ${f.recommendation}`);
      if (f.suggestion) {
        lines.push(
          `      Replace: "${f.suggestion.from}" → "${f.suggestion.to}"`
        );
      }
    }
    lines.push("");
  }
  return lines.join("\n");
}

export default function AnswerReadinessPanel() {
  const { client, error: clientError, isInitialized } = useMarketplaceClient();
  const [page, setPage] = useState<PageInfo | null>(null);
  const [sitecoreContextId, setSitecoreContextId] = useState<string | null>(
    null
  );
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [resultPageId, setResultPageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [editCount, setEditCount] = useState(0);
  const [previousScore, setPreviousScore] = useState<number | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");

  const activePageIdRef = useRef<string | null>(null);
  const analyzeAbortRef = useRef<AbortController | null>(null);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultPageIdRef = useRef<string | null>(null);
  const analyzeRef = useRef<() => Promise<void>>(async () => {});
  const pageRef = useRef<PageInfo | null>(null);
  const sitecoreContextIdRef = useRef<string | null>(null);
  const lastScoreByPageRef = useRef<Map<string, number>>(new Map());

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const categoryRefs = useRef<Map<string, HTMLElement>>(new Map());

  useEffect(() => {
    pageRef.current = page;
  }, [page]);
  useEffect(() => {
    resultPageIdRef.current = resultPageId;
  }, [resultPageId]);
  useEffect(() => {
    sitecoreContextIdRef.current = sitecoreContextId;
  }, [sitecoreContextId]);

  const scrollToCategory = useCallback((categoryKey: string) => {
    const container = scrollContainerRef.current;
    const target = categoryRefs.current.get(categoryKey);
    if (!container || !target) return;
    const containerTop = container.getBoundingClientRect().top;
    const targetTop = target.getBoundingClientRect().top;
    const offset =
      targetTop - containerTop + container.scrollTop - HEADER_SCROLL_OFFSET;
    container.scrollTo({ top: Math.max(0, offset), behavior: "smooth" });
  }, []);

  const scrollToTop = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const registerCategoryRef = useCallback(
    (category: string, el: HTMLElement | null) => {
      if (el) categoryRefs.current.set(category, el);
      else categoryRefs.current.delete(category);
    },
    []
  );

  const handlePriorityClick = useCallback(
    (category: string) => {
      if (severityFilter === "pass") setSeverityFilter("all");
      setExpandedCategory(category);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToCategory(category);
        });
      });
    },
    [severityFilter, scrollToCategory]
  );

  const handleSeverityFilterChange = useCallback(
    (filter: SeverityFilter) => {
      setSeverityFilter(filter);
      setExpandedCategory(null);
      requestAnimationFrame(() => scrollToTop());
    },
    [scrollToTop]
  );

  useEffect(() => {
    if (!isInitialized || !client) return;
    let cancelled = false;
    let unsubscribeContext: (() => void) | undefined;
    let unsubscribeFields: (() => void) | undefined;

    const handlePageContext = (raw: unknown) => {
      const ctx = raw as PageContext | undefined;
      const pageInfo = ctx?.pageInfo ?? null;
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
        setEditCount(0);
        setPreviousScore(null);
        setExpandedCategory(null);
        setSeverityFilter("all");

        activePageIdRef.current = nextId;

        settleTimerRef.current = setTimeout(() => {
          if (cancelled) return;
          if (activePageIdRef.current !== nextId) return;
          void analyzeRef.current();
        }, 500);
      }
    };

    const initialize = async () => {
      try {
        const appRes = await client.query("application.context");
        if (cancelled) return;
        const appData = (appRes as { data?: unknown }).data ?? appRes;
        const access = (
          appData as {
            resourceAccess?: Array<{ context?: { live?: string } }>;
          }
        ).resourceAccess;
        const ctxId = access?.[0]?.context?.live;
        if (ctxId) setSitecoreContextId(ctxId);

        const response = await client.query("pages.context", {
          subscribe: true,
          onSuccess: (context) => {
            if (!cancelled) handlePageContext(context);
          },
        });
        const envelope = response as unknown as QueryEnvelope<PageContext>;
        unsubscribeContext = envelope.unsubscribe ?? undefined;

        if (envelope.data && activePageIdRef.current === null) {
          handlePageContext(envelope.data);
        }

        const fieldsSub = client.subscribe("pages.content.fieldsUpdated", {
          onData: () => {
            if (cancelled) return;
            if (
              resultPageIdRef.current &&
              activePageIdRef.current === resultPageIdRef.current
            ) {
              setEditCount((c) => c + 1);
            }
          },
          onError: (err) => console.error("Fields subscription error:", err),
        });
        unsubscribeFields =
          typeof fieldsSub === "function" ? fieldsSub : undefined;
      } catch (e) {
        if (!cancelled) {
          setMessage(e instanceof Error ? e.message : "Context load failed.");
        }
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

  const analyze = useCallback(async () => {
    const currentPage = pageRef.current;
    const pageId = currentPage?.id ?? currentPage?.itemId;
    const ctxId = sitecoreContextIdRef.current;
    if (!client || !pageId || !ctxId) return;

    analyzeAbortRef.current?.abort();
    const controller = new AbortController();
    analyzeAbortRef.current = controller;

    const analyzedId = pageId;
    setLoading(true);
    setMessage(null);
    setEditCount(0);

    try {
      const html = await readPageHtml(
        client,
        analyzedId,
        currentPage?.language,
        ctxId
      );
      if (controller.signal.aborted) return;
      if (activePageIdRef.current !== analyzedId) return;

      if (!html) {
        setMessage(
          "The page HTML could not be retrieved from the published HTML endpoint."
        );
        return;
      }

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          html,
          pageId: analyzedId,
          language: currentPage?.language,
        }),
        signal: controller.signal,
      });

      if (!res.ok)
        throw new Error("The analysis service could not process the page.");
      const next = (await res.json()) as AnalysisResult;

      if (controller.signal.aborted) return;
      if (activePageIdRef.current !== analyzedId) return;

      const prior = lastScoreByPageRef.current.get(analyzedId) ?? null;
      setPreviousScore(prior);
      if (next.mode === "scored" && next.score !== null) {
        lastScoreByPageRef.current.set(analyzedId, next.score);
      }

      setResult(next);
      setResultPageId(analyzedId);
    } catch (e) {
      if (controller.signal.aborted) return;
      if (activePageIdRef.current !== analyzedId) return;
      setMessage(e instanceof Error ? e.message : "Analysis failed.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    analyzeRef.current = analyze;
  }, [analyze]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "r" && e.key !== "R") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA"))
        return;
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
  const resultsAreCurrent =
    result !== null && resultPageId !== null && resultPageId === pageId;
  const canAnalyze = Boolean(
    isInitialized && client && pageId && sitecoreContextId && !loading
  );

  const counts = result
    ? {
        all: result.findings.length,
        errors: result.findings.filter((f) => f.severity === "error").length,
        warnings: result.findings.filter((f) => f.severity === "warning").length,
        infos: result.findings.filter((f) => f.severity === "info").length,
        passes: result.findings.filter((f) => f.severity === "pass").length,
      }
    : { all: 0, errors: 0, warnings: 0, infos: 0, passes: 0 };

  const priorityFilter: "all" | "error" | "warning" =
    severityFilter === "error"
      ? "error"
      : severityFilter === "warning"
      ? "warning"
      : "all";

  const showPriorityCard =
    resultsAreCurrent && result.mode === "scored" && severityFilter !== "pass";

  const visibleCategories = result ? result.categories : [];

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-50">
      <header className="z-20 shrink-0 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-3 px-3.5 pt-3 pb-2">
          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-medium text-slate-600">
            AEO / GEO
          </span>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              title="How this score is calculated"
              aria-label="How this score is calculated"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              ?
            </button>
            <button
              type="button"
              onClick={() => void analyzeRef.current()}
              disabled={!canAnalyze}
              title="Re-analyze page (R)"
              aria-label="Re-analyze"
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
            {resultsAreCurrent && (
              <CopyButton
                iconOnly
                summary={buildSummaryReport(result, page)}
                checklist={buildChecklist(result)}
                full={buildReport(result, page)}
              />
            )}
          </div>
        </div>

        {page && (
          <div className="border-t border-slate-100 px-3.5 py-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[9.5px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                Current page
              </span>
              {resultsAreCurrent && (
                <span
                  className="text-[9px] font-medium text-slate-400"
                  title={new Date(result.analyzedAt).toLocaleString()}
                >
                  · published HTML
                </span>
              )}
            </div>
            <div className="mt-0.5 flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px] font-semibold text-slate-900">
                  {page.displayName ?? page.name ?? "Untitled page"}
                </div>
                {page.path && (
                  <div className="truncate text-[9.5px] text-slate-500">
                    {page.path}
                  </div>
                )}
              </div>
              <span
                className="hidden shrink-0 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[9px] text-slate-500 sm:inline-block"
                title="Press R to re-analyze"
              >
                R
              </span>
            </div>
          </div>
        )}

        {resultsAreCurrent && result.mode === "scored" && (
          <div className="border-t border-slate-100 px-3.5 py-3">
            <ScoreCard result={result} previousScore={previousScore} />
          </div>
        )}

        {resultsAreCurrent && result.mode === "scored" && (
          <div className="grid grid-cols-5 gap-0.5 border-t border-slate-100 bg-slate-50/60 px-2.5 py-1.5">
            {[
              {
                key: "all" as const,
                label: "All",
                count: counts.all,
                title: "Every finding on this page",
              },
              {
                key: "error" as const,
                label: "Errors",
                count: counts.errors,
                title: "Error-level findings",
              },
              {
                key: "warning" as const,
                label: "Warnings",
                count: counts.warnings,
                title: "Warning-level findings",
              },
              {
                key: "info" as const,
                label: "Info",
                count: counts.infos,
                title: "Informational findings",
              },
              {
                key: "pass" as const,
                label: "Passed",
                count: counts.passes,
                title: "Passed checks",
              },
            ].map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => handleSeverityFilterChange(chip.key)}
                title={chip.title}
                className={`flex items-center justify-center gap-1 rounded-md px-1 py-1 text-[9px] font-semibold transition-colors ${
                  severityFilter === chip.key
                    ? "bg-white text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <span className="truncate">{chip.label}</span>
                <span
                  className={`rounded-full px-1 text-[8px] font-bold ${
                    chip.key === "error"
                      ? "bg-red-100 text-red-700"
                      : chip.key === "warning"
                      ? "bg-amber-100 text-amber-700"
                      : chip.key === "info"
                      ? "bg-slate-200 text-slate-700"
                      : chip.key === "pass"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {chip.count}
                </span>
              </button>
            ))}
          </div>
        )}
      </header>

      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto"
        style={{ minHeight: 0 }}
      >
        <div className="flex flex-col gap-3 px-3.5 py-3.5">
          {!page && !loading && <EmptyState />}

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

          {message && (
            <Banner
              variant="error"
              message={message}
              onRetry={() => void analyzeRef.current()}
            />
          )}

          {resultsAreCurrent && result.mode === "diagnostic" && (
            <DiagnosticCard
              result={result}
              onReanalyze={() => void analyzeRef.current()}
              loading={loading}
            />
          )}

          {resultsAreCurrent && result.mode === "scored" && (
            <>
              {editCount > 0 && (
                <Banner
                  variant="stale"
                  analyzedAt={result.analyzedAt}
                  edited={editCount > 0}
                  onRetry={() => void analyzeRef.current()}
                />
              )}

              {severityFilter === "error" && counts.errors === 0 && (
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[11px] leading-relaxed text-slate-600">
                  No error-level findings on this page. Switch to{" "}
                  <strong>Warnings</strong> or <strong>All</strong> to see what
                  is available.
                </div>
              )}

              {severityFilter === "warning" && counts.warnings === 0 && (
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[11px] leading-relaxed text-slate-600">
                  No warning-level findings on this page.
                </div>
              )}

              {severityFilter === "info" && counts.infos === 0 && (
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[11px] leading-relaxed text-slate-600">
                  No informational findings on this page.
                </div>
              )}

              {severityFilter === "pass" && counts.passes === 0 && (
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[11px] leading-relaxed text-slate-600">
                  No passed checks on this page.
                </div>
              )}

              {showPriorityCard && (
                <PriorityCard
                  result={result}
                  onExpandCategory={handlePriorityClick}
                  severityFilter={priorityFilter}
                />
              )}

              {visibleCategories.map((category) => (
                <div
                  key={category.category}
                  ref={(el) => registerCategoryRef(category.category, el)}
                  data-category={category.category}
                >
                  <CategoryCard
                    category={category}
                    forceExpanded={expandedCategory === category.category}
                    severityFilter={severityFilter}
                  />
                </div>
              ))}

              <div className="flex items-center justify-between gap-2">
                <p className="text-[9.5px] leading-relaxed text-slate-400">
                  {result.source.wordCount} words ·{" "}
                  {result.source.headingCount} headings ·{" "}
                  {result.source.paragraphCount} paragraphs
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      <HelpModal
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        result={result}
      />
    </div>
  );
}