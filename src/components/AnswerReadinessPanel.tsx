"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMarketplaceClient } from "@/src/utils/hooks/useMarketplaceClient";
import type { AnalysisResult, PageContext, PageInfo } from "@/src/types/analysis";
import ScoreCard from "./ScoreCard";
import CategoryCard from "./CategoryCard";

interface QueryEnvelope<T> {
  data?: T;
  unsubscribe?: () => void;
}

export default function AnswerReadinessPanel() {
  const { client, error: clientError, isInitialized } = useMarketplaceClient();
  const [page, setPage] = useState<PageInfo | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const applyContext = useCallback((raw: unknown) => {
    const ctx = raw as PageContext | undefined;
    const info = ctx?.pageInfo ?? null;
    if (info && (info.id || info.itemId)) {
      setPage(info);
      setMessage(null);
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    if (!isInitialized || !client) return;
    let cancelled = false;

    const initialize = async () => {
      try {
        await client.query("application.context");
        if (cancelled) return;

        const response = await client.query("pages.context", {
          subscribe: true,
          onSuccess: (context) => {
            if (!cancelled) applyContext(context);
          },
        });

        const envelope = response as unknown as QueryEnvelope<PageContext>;
        unsubscribeRef.current = envelope.unsubscribe ?? null;

        const payload = envelope.data ?? (response as unknown as PageContext);
        if (!applyContext(payload) && !cancelled) {
          setMessage("Page Builder context not received.");
        }
      } catch (e) {
        if (!cancelled) {
          setMessage(e instanceof Error ? e.message : "Context load failed.");
        }
      }
    };

    void initialize();
    return () => {
      cancelled = true;
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
    };
  }, [client, isInitialized, applyContext]);

  const analyze = useCallback(async () => {
    const pageId = page?.id ?? page?.itemId;
    if (!client || !pageId) return;

    setLoading(true);
    setMessage(null);

    try {
      const sdk = client as unknown as { getPageHTML?: () => Promise<string> };
      if (typeof sdk.getPageHTML !== "function") {
        setMessage("Rendered HTML inspection is not available in this environment.");
        return;
      }

      const html = await sdk.getPageHTML();
      if (!html) {
        setMessage("The current page did not return rendered HTML.");
        return;
      }

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ html, pageId, language: page?.language }),
      });

      if (!res.ok) throw new Error("The analysis service could not process the page.");
      setResult((await res.json()) as AnalysisResult);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Analysis failed.");
    } finally {
      setLoading(false);
    }
  }, [client, page]);

  if (clientError) {
    return (
      <div className="min-h-full bg-panel-bg p-4">
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
          Marketplace SDK initialization failed: {clientError.message}
        </div>
      </div>
    );
  }

  const pageId = page?.id ?? page?.itemId;

  return (
    <div className="flex min-h-full flex-col gap-3 bg-panel-bg p-4">
      {/* Header */}
      <header className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-panel-muted">
            SitecoreAI
          </div>
          <h1 className="mt-0.5 text-lg font-semibold leading-tight text-panel-text">
            Answer Readiness
          </h1>
        </div>
        <span className="shrink-0 rounded-full border border-panel-border bg-white px-2.5 py-1 text-[10px] font-medium text-panel-muted">
          AEO / GEO
        </span>
      </header>

      {/* Current Page */}
      <section className="rounded-lg border border-panel-border bg-panel-card p-3.5 shadow-sm">
        <div className="text-[10px] font-bold uppercase tracking-wider text-panel-muted">
          Current page
        </div>
        {page ? (
          <div className="mt-1.5 space-y-1">
            <div className="truncate text-[13px] font-semibold text-panel-text">
              {page.displayName ?? page.name ?? "Untitled page"}
            </div>
            {page.path && (
              <div className="truncate text-[10px] text-panel-subtle">
                {page.path}
              </div>
            )}
            {page.language && (
              <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-panel-muted">
                {page.language}
              </span>
            )}
          </div>
        ) : (
          <div className="mt-2 space-y-2">
            <div className="h-3.5 w-2/3 animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200" />
          </div>
        )}
      </section>

      {/* Analyze CTA */}
      {!result && (
        <section className="rounded-lg border border-panel-border bg-panel-card p-3.5 shadow-sm">
          <div className="text-[13px] font-semibold text-panel-text">
            Analyze this page
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-panel-muted">
            Check answer structure, passage integrity, factual density, entity
            clarity, and FAQ readiness.
          </p>
          <button
            className="mt-3 w-full rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={analyze}
            disabled={!isInitialized || loading || !pageId}
          >
            {loading ? "Analyzing…" : "Analyze page"}
          </button>
          {message && (
            <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-2.5 text-[11px] text-red-800">
              {message}
            </div>
          )}
        </section>
      )}

      {/* Results */}
      {result && (
        <>
          <ScoreCard result={result} onReanalyze={analyze} loading={loading} />

          {result.categories.map((category) => (
            <CategoryCard key={category.category} category={category} />
          ))}

          <p className="mt-1 text-center text-[10px] leading-relaxed text-panel-subtle">
            Analyzed {new Date(result.analyzedAt).toLocaleString()} ·{" "}
            {result.source.htmlInspected ? "rendered HTML inspected" : "HTML not inspected"}
          </p>
        </>
      )}
    </div>
  );
}