"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMarketplaceClient } from "@/src/utils/hooks/useMarketplaceClient";
import type { AnalysisResult, PageContext, PageInfo } from "@/src/types/analysis";

function severityClass(severity: string) {
  if (severity === "pass") return "pass";
  if (severity === "warning") return "warning";
  if (severity === "error") return "error";
  if (severity === "info") return "info";
  return "";
}

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
  const [diagnostics, setDiagnostics] = useState<string[]>([]);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const log = useCallback((entry: string) => {
    console.log(`[AnswerReadiness] ${entry}`);
    setDiagnostics((prev) => [...prev.slice(-9), entry]);
  }, []);

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
        log("Querying application.context");
        await client.query("application.context");
        log("application.context ok");

        if (cancelled) return;

        log("Subscribing to pages.context");
        const response = await client.query("pages.context", {
          subscribe: true,
          onSuccess: (context) => {
            if (cancelled) return;
            log(`pages.context onSuccess received`);
            applyContext(context);
          },
        });

        const envelope = response as unknown as QueryEnvelope<PageContext>;
        unsubscribeRef.current = envelope.unsubscribe ?? null;

        // The awaited query resolves with { data: {...} }. onSuccess receives
        // the unwrapped value, but we handle both shapes defensively.
        const payload =
          envelope.data ??
          (response as unknown as PageContext);

        if (applyContext(payload)) {
          log("Page context applied from initial response");
        } else if (!cancelled) {
          log("Initial pages.context response did not contain pageInfo");
          setMessage(
            "Page Builder context not received. Ensure the app is opened inside the Pages Context Panel extension point."
          );
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        log(`Context initialization failed: ${msg}`);
        if (cancelled) return;
        setMessage(`Failed to load Page Builder context: ${msg}`);
      }
    };

    void initialize();

    return () => {
      cancelled = true;
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
    };
  }, [client, isInitialized, log, applyContext]);

  const analyze = useCallback(async () => {
    const pageId = page?.id ?? page?.itemId;
    if (!client || !pageId) {
      setMessage("No active Page Builder page is available.");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const sdk = client as unknown as {
        getPageHTML?: () => Promise<string>;
      };

      if (typeof sdk.getPageHTML !== "function") {
        setMessage(
          "Rendered HTML inspection is not available in this environment. Contact your administrator if you expect this capability."
        );
        setResult(null);
        return;
      }

      log("Calling getPageHTML()");
      const html = await sdk.getPageHTML();
      log(`getPageHTML returned ${html?.length ?? 0} characters`);

      if (!html) {
        setMessage("The current page did not return rendered HTML.");
        return;
      }

      const analysisResponse = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          html,
          pageId,
          language: page?.language,
        }),
      });

      if (!analysisResponse.ok) {
        throw new Error("The analysis service could not process the page.");
      }

      setResult((await analysisResponse.json()) as AnalysisResult);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Analysis failed.";
      log(`Analysis error: ${msg}`);
      setMessage(msg);
    } finally {
      setLoading(false);
    }
  }, [client, page, log]);

  if (clientError) {
    return (
      <main className="panel">
        <div className="error">
          Marketplace SDK initialization failed: {clientError.message}
        </div>
      </main>
    );
  }

  const pageId = page?.id ?? page?.itemId;

  return (
    <main className="panel">
      <div className="header">
        <div>
          <div className="eyebrow">SitecoreAI</div>
          <h1>Answer Readiness</h1>
        </div>
        <span className="pill">AEO / GEO</span>
      </div>

      <section className="card pageInfo">
        <div className="eyebrow">Current page</div>
        <div className="pageName">
          {page?.displayName ?? page?.name ?? "Waiting for Page Builder context..."}
        </div>
        {page?.path && <div className="pagePath">{page.path}</div>}
        {page?.language && (
          <div className="meta">
            <span className="pill">{page.language}</span>
          </div>
        )}
      </section>

      {!result && (
        <section className="card">
          <div className="status">Analyze this page</div>
          <div className="subtle">
            Check structure, entity clarity, metadata, structured data, and answer-oriented
            content.
          </div>
          <div className="actions">
            <button
              className="primary"
              onClick={analyze}
              disabled={!isInitialized || loading || !pageId}
            >
              {loading ? "Analyzing…" : "Analyze page"}
            </button>
          </div>
          {message && (
            <div className="error" style={{ marginTop: 10 }}>
              {message}
            </div>
          )}
        </section>
      )}

      {result && (
        <>
          <section className="card scoreCard">
            <div className="score">
              <div>
                {result.score}
                <small>/100</small>
              </div>
            </div>
            <div>
              <div className="status">
                {result.score >= 80
                  ? "Good readiness"
                  : result.score >= 60
                  ? "Needs improvement"
                  : "Significant gaps"}
              </div>
              <div className="subtle">
                Internal content-readiness indicator. It is not a search-engine ranking score.
              </div>
              <div className="actions">
                <button className="secondary" onClick={analyze} disabled={loading}>
                  {loading ? "Analyzing…" : "Re-analyze"}
                </button>
              </div>
            </div>
          </section>

          {result.categories.map((category) => (
            <section className="card section" key={category.category}>
              <div className="sectionHeader">
                <span className="sectionTitle">{category.label}</span>
                <span className="sectionScore">
                  {category.score}/{category.maxScore}
                </span>
              </div>

              {category.findings.map((finding) => (
                <div className="finding" key={finding.id}>
                  <div className="findingTop">
                    <span className={`dot ${severityClass(finding.severity)}`} />
                    <div className="findingTitle">{finding.title}</div>
                  </div>
                  <div className="findingText">{finding.description}</div>
                  <div className="recommendation">{finding.recommendation}</div>
                  {finding.evidence && (
                    <div className="meta">
                      <span className="pill">
                        Evidence ({finding.evidence.source}):{" "}
                        {finding.evidence.value?.slice(0, 100)}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </section>
          ))}

          <div className="footer">
            Analyzed {new Date(result.analyzedAt).toLocaleString()} ·{" "}
            {result.source.htmlInspected ? "rendered HTML inspected" : "HTML not inspected"}
          </div>
        </>
      )}

      {diagnostics.length > 0 && (
        <details className="card" style={{ marginTop: 12 }}>
          <summary className="eyebrow" style={{ cursor: "pointer" }}>
            Diagnostics ({diagnostics.length})
          </summary>
          <div style={{ fontFamily: "monospace", fontSize: 11, marginTop: 8 }}>
            {diagnostics.map((d, i) => (
              <div key={i} style={{ marginBottom: 4 }}>
                {d}
              </div>
            ))}
          </div>
        </details>
      )}
    </main>
  );
}