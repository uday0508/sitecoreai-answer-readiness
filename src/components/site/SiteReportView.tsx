"use client";

import { useEffect, useState } from "react";
import type { AnalysisCategory } from "@/src/types/analysis";
import type { NormalizedPage } from "./SitePageTree";
import type { PageReport } from "./SiteAnalysisView";
import SiteFindingCard from "./SiteFindingCard";
import CopyButton from "@/src/components/CopyButton";

interface Props {
  report: PageReport;
  siteAverage: number | null;
  flatPages: NormalizedPage[];
  currentIndex: number;
  onPrev: () => void;
  onNext: () => void;
  onSelectPage: (page: NormalizedPage) => void;
  onOpenHelp?: () => void;
}

const CATEGORY_LABELS: Record<AnalysisCategory, string> = {
  "answer-structure": "Answer Structure",
  "passage-integrity": "Passage Integrity",
  "factual-density": "Factual Density",
  "entity-clarity": "Entity Clarity",
  "faq-readiness": "FAQ Readiness",
  freshness: "Freshness",
  citation: "Citation Signals",
};

const CATEGORY_HELP: Record<AnalysisCategory, string> = {
  "answer-structure":
    "AI systems extract direct answers from headings and opening paragraphs. Question headings map cleanly to user queries.",
  "passage-integrity":
    "AI retrieves passages, not pages. If a section depends on the one above, the extracted fragment becomes unusable.",
  "factual-density":
    "Concrete claims — numbers, dates, comparisons — are preferentially quoted by AI answer engines over vague prose.",
  "entity-clarity":
    "Clear entity definition and authorship signals help AI attribute claims to the right source.",
  "faq-readiness":
    "FAQPage schema is the one structured data type consistently correlated with AI citation because it mirrors Q&A extraction. Pages with no FAQ content and no FAQPage schema score 0 in this category.",
  freshness:
    "AI engines weight recency. A machine-readable last-modified date (article:modified_time, dateModified in JSON-LD) helps them trust the page as current. Pages with no freshness signal score 0 in this category.",
  citation:
    "Pages that cite external sources and attribute claims to named sources are more quotable by AI answer engines.",
};

const PRIMARY_CATEGORIES: AnalysisCategory[] = [
  "answer-structure",
  "passage-integrity",
  "factual-density",
];

function readinessLabel(score: number) {
  if (score >= 80) return "Good readiness";
  if (score >= 60) return "Needs improvement";
  if (score >= 35) return "Significant gaps";
  return "Not answer-ready";
}

function scoreTone(score: number | null) {
  if (score === null) return "text-slate-400";
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-amber-600";
  if (score >= 35) return "text-orange-600";
  return "text-red-600";
}

function scoreBar(score: number | null) {
  if (score === null) return "bg-slate-300";
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-amber-500";
  if (score >= 35) return "bg-orange-500";
  return "bg-red-500";
}

function safeFilename(name: string, suffix: string) {
  const slug = name
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return `${slug || "page"}-${suffix}.md`;
}

export default function SiteReportView({
  report,
  siteAverage,
  flatPages,
  currentIndex,
  onPrev,
  onNext,
  onSelectPage,
  onOpenHelp,
}: Props) {
  const { page, result, language } = report;

  const breadcrumb = useBreadcrumb(page.path, flatPages);
  const isDiagnostic = result.mode === "diagnostic";

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA"))
        return;
      if (e.key === "[") {
        e.preventDefault();
        onPrev();
      } else if (e.key === "]") {
        e.preventDefault();
        onNext();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onPrev, onNext]);

  if (isDiagnostic) {
    return (
      <div className="mx-auto w-full max-w-5xl px-10 pb-20">
        <StickyHeader
          breadcrumb={breadcrumb}
          flatPages={flatPages}
          currentIndex={currentIndex}
          onPrev={onPrev}
          onNext={onNext}
          onSelectPage={onSelectPage}
          report={report}
          siteAverage={siteAverage}
          onOpenHelp={onOpenHelp}
        />

        <section className="mt-8 rounded-xl border border-amber-200 bg-amber-50/70 p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-[13px] font-bold text-white">
              !
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-[17px] font-semibold text-amber-900">
                Not enough content to score
              </h2>
              <p className="mt-1.5 text-[14px] leading-relaxed text-amber-800">
                This page does not contain enough structured content to produce a
                meaningful answer readiness score. The analyzer found the
                following gaps.
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-amber-200 bg-white p-4">
            <div className="text-[12px] font-semibold uppercase tracking-[0.06em] text-amber-700">
              Missing signals · {result.diagnostics.length}
            </div>
            <ul className="mt-2.5 space-y-1.5">
              {result.diagnostics.map((d, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                  <span className="text-[14px] leading-relaxed text-slate-700">
                    {d}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-white p-3 ring-1 ring-inset ring-amber-100">
              <div className="text-[20px] font-bold text-slate-900">
                {result.source.wordCount}
              </div>
              <div className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Words
              </div>
            </div>
            <div className="rounded-lg bg-white p-3 ring-1 ring-inset ring-amber-100">
              <div className="text-[20px] font-bold text-slate-900">
                {result.source.headingCount}
              </div>
              <div className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Headings
              </div>
            </div>
            <div className="rounded-lg bg-white p-3 ring-1 ring-inset ring-amber-100">
              <div className="text-[20px] font-bold text-slate-900">
                {result.source.paragraphCount}
              </div>
              <div className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Paragraphs
              </div>
            </div>
          </div>

          <p className="mt-5 text-[14px] leading-relaxed text-amber-800">
            Add page-level content — an H1, an opening paragraph, prose sections,
            and at least one FAQ or Q&A section — then re-run the analysis to get
            a scored result.
          </p>
        </section>
      </div>
    );
  }

  const score = result.score ?? 0;

  const findings = result.findings;
  const actionable = findings
    .filter((f) => f.severity === "error" || f.severity === "warning")
    .sort((a, b) => b.scoreImpact - a.scoreImpact);
  const passed = findings.filter((f) => f.severity === "pass");
  const criticalCount = findings.filter((f) => f.severity === "error").length;

  const topAction = actionable[0] ?? null;
  const delta = siteAverage !== null ? score - siteAverage : null;

  const primary = result.categories.filter((c) =>
    PRIMARY_CATEGORIES.includes(c.category)
  );
  const supporting = result.categories.filter(
    (c) => !PRIMARY_CATEGORIES.includes(c.category)
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-10 pb-20">
      <StickyHeader
        breadcrumb={breadcrumb}
        flatPages={flatPages}
        currentIndex={currentIndex}
        onPrev={onPrev}
        onNext={onNext}
        onSelectPage={onSelectPage}
        report={report}
        siteAverage={siteAverage}
        onOpenHelp={onOpenHelp}
      />

      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-8 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex items-start justify-between gap-10">
          <div className="min-w-0 flex-1">
            <h2 className="text-3xl font-semibold leading-tight text-slate-900">
              {page.name}
            </h2>
            <div className="mt-2 truncate text-[15px] text-slate-500">
              {page.path}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2.5 text-[15px]">
              <span className={`font-semibold ${scoreTone(result.score)}`}>
                {readinessLabel(score)}
              </span>
              {siteAverage !== null && delta !== null && (
                <>
                  <span className="h-4 w-px bg-slate-200" />
                  <span className="text-slate-500">
                    {delta > 0 ? "+" : ""}
                    {delta} vs site avg{" "}
                    <span className="font-semibold text-slate-700">
                      {siteAverage}
                    </span>
                  </span>
                </>
              )}
              <span className="h-4 w-px bg-slate-200" />
              <span className="text-slate-500">
                {actionable.length} issue{actionable.length === 1 ? "" : "s"}
                {criticalCount > 0 && (
                  <>
                    {" · "}
                    <span className="font-semibold text-red-700">
                      {criticalCount} critical
                    </span>
                  </>
                )}
              </span>
              <span className="h-4 w-px bg-slate-200" />
              <span className="text-slate-500">{language}</span>
            </div>

            <div className="mt-5 text-[14px] text-slate-400">
              {result.source.wordCount} words · {result.source.headingCount}{" "}
              headings · {result.source.paragraphCount} paragraphs
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end">
            <div
              className={`text-6xl font-bold leading-none ${scoreTone(
                result.score
              )}`}
            >
              {result.score ?? "—"}
              {result.score !== null && (
                <span className="text-2xl font-medium text-slate-400">
                  /100
                </span>
              )}
            </div>
            <div className="mt-5 h-3 w-64 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${scoreBar(
                  result.score
                )} transition-all`}
                style={{ width: `${score}%` }}
              />
            </div>
          </div>
        </div>

        {topAction && (
          <div className="mt-7 flex items-start gap-4 rounded-lg border border-amber-200 bg-amber-50/70 p-5">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500 text-[14px] font-bold text-white">
              !
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-semibold uppercase tracking-[0.06em] text-amber-800">
                Start here
              </div>
              <div className="mt-1.5 text-[16px] font-semibold text-slate-900">
                {topAction.title}
              </div>
              <div className="mt-1.5 text-[15px] leading-relaxed text-slate-600">
                {topAction.recommendation}
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="mt-8 space-y-4">
        <div className="flex items-baseline justify-between">
          <h3 className="text-[15px] font-semibold uppercase tracking-[0.06em] text-slate-500">
            Category breakdown
          </h3>
          <span className="text-[12.5px] text-slate-400">
            7 categories · 100 points
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {primary.map((cat) => {
            const unevaluated = cat.status === "insufficient-content";
            const ratio = cat.maxScore > 0 ? cat.score / cat.maxScore : 0;
            const pct = Math.round(ratio * 100);
            const catActionable = cat.findings.filter(
              (f) => f.severity === "error" || f.severity === "warning"
            ).length;
            return (
              <CategoryTile
                key={cat.category}
                label={CATEGORY_LABELS[cat.category]}
                help={CATEGORY_HELP[cat.category]}
                score={cat.score}
                maxScore={cat.maxScore}
                pct={pct}
                unevaluated={unevaluated}
                issueCount={catActionable}
                variant="primary"
              />
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {supporting.map((cat) => {
            const unevaluated = cat.status === "insufficient-content";
            const ratio = cat.maxScore > 0 ? cat.score / cat.maxScore : 0;
            const pct = Math.round(ratio * 100);
            const catActionable = cat.findings.filter(
              (f) => f.severity === "error" || f.severity === "warning"
            ).length;
            return (
              <CategoryTile
                key={cat.category}
                label={CATEGORY_LABELS[cat.category]}
                help={CATEGORY_HELP[cat.category]}
                score={cat.score}
                maxScore={cat.maxScore}
                pct={pct}
                unevaluated={unevaluated}
                issueCount={catActionable}
                variant="compact"
              />
            );
          })}
        </div>
      </section>

      {actionable.length > 0 && (
        <section className="mt-8 space-y-4">
          <h3 className="text-[15px] font-semibold uppercase tracking-[0.06em] text-slate-500">
            Actionable findings · {actionable.length}
          </h3>
          <div className="space-y-4">
            {actionable.map((finding, i) => (
              <SiteFindingCard key={finding.id} finding={finding} index={i + 1} />
            ))}
          </div>
        </section>
      )}

      {passed.length > 0 && (
        <section className="mt-8 space-y-4">
          <h3 className="text-[15px] font-semibold uppercase tracking-[0.06em] text-slate-500">
            Passed checks · {passed.length}
          </h3>
          <div className="rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="divide-y divide-slate-100">
              {passed.map((finding) => (
                <div
                  key={finding.id}
                  className="flex items-start gap-4 px-7 py-4"
                >
                  <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-3 w-3"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-semibold text-slate-900">
                      {finding.title}
                    </div>
                    <div className="mt-1 text-[14px] leading-relaxed text-slate-500">
                      {finding.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function StickyHeader({
  breadcrumb,
  flatPages,
  currentIndex,
  onPrev,
  onNext,
  onSelectPage,
  report,
  siteAverage,
  onOpenHelp,
}: {
  breadcrumb: Array<{ path: string; name: string }>;
  flatPages: NormalizedPage[];
  currentIndex: number;
  onPrev: () => void;
  onNext: () => void;
  onSelectPage: (page: NormalizedPage) => void;
  report: PageReport;
  siteAverage: number | null;
  onOpenHelp?: () => void;
}) {
  return (
    <div className="sticky top-0 z-10 -mx-10 border-b border-slate-200 bg-slate-50/95 px-10 py-4 backdrop-blur">
      <div className="flex items-center justify-between gap-4">
        <nav className="flex min-w-0 items-center gap-2 text-[14px] text-slate-500">
          {breadcrumb.map((crumb, i) => (
            <span key={crumb.path} className="flex min-w-0 items-center gap-2">
              {i > 0 && <span className="shrink-0 text-slate-300">›</span>}
              <button
                type="button"
                onClick={() => {
                  const target = flatPages.find((p) => p.path === crumb.path);
                  if (target) onSelectPage(target);
                }}
                className="truncate transition-colors hover:text-slate-900"
              >
                {crumb.name}
              </button>
            </span>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          {onOpenHelp && (
            <button
              type="button"
              onClick={onOpenHelp}
              title="How this score is calculated"
              aria-label="How this score is calculated"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-[12px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              ?
            </button>
          )}

          <CopyButton
            iconOnly
            summary={buildSummaryReport(report, siteAverage)}
            checklist={buildChecklist(report)}
            full={buildFullReport(report, siteAverage)}
            filename={safeFilename(report.page.name, "answer-readiness")}
          />

          <span className="mx-1.5 h-4 w-px bg-slate-200" />

          <button
            type="button"
            onClick={onPrev}
            disabled={currentIndex <= 0}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
            title="Previous page ( [ )"
            aria-label="Previous page"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>

          <span className="flex items-center gap-1.5 px-2 text-[12.5px] text-slate-500">
            {currentIndex + 1} of {flatPages.length}
            <kbd className="hidden rounded border border-slate-200 bg-white px-1 py-0.5 font-mono text-[10px] text-slate-500 sm:inline-block">
              [
            </kbd>
            <kbd className="hidden rounded border border-slate-200 bg-white px-1 py-0.5 font-mono text-[10px] text-slate-500 sm:inline-block">
              ]
            </kbd>
          </span>

          <button
            type="button"
            onClick={onNext}
            disabled={currentIndex >= flatPages.length - 1}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
            title="Next page ( ] )"
            aria-label="Next page"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function CategoryTile({
  label,
  help,
  score,
  maxScore,
  pct,
  unevaluated,
  issueCount,
  variant = "compact",
}: {
  label: string;
  help: string;
  score: number;
  maxScore: number;
  pct: number;
  unevaluated: boolean;
  issueCount: number;
  variant?: "primary" | "compact";
}) {
  const [showHelp, setShowHelp] = useState(false);

  const isPrimary = variant === "primary";
  const isZero = !unevaluated && score === 0;
  const isPerfect = !unevaluated && score === maxScore;
  const hasIssues = !unevaluated && issueCount > 0;

  const accent = unevaluated
    ? "bg-slate-200"
    : isPerfect
    ? "bg-emerald-500"
    : isZero
    ? "bg-red-500"
    : pct >= 60
    ? "bg-amber-500"
    : "bg-red-500";

  const pillTone = unevaluated
    ? "bg-slate-100 text-slate-500 ring-slate-200"
    : isPerfect
    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
    : isZero
    ? "bg-red-50 text-red-700 ring-red-200"
    : pct >= 60
    ? "bg-amber-50 text-amber-700 ring-amber-200"
    : "bg-red-50 text-red-700 ring-red-200";

  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-shadow hover:shadow-[0_2px_8px_rgba(15,23,42,0.06)] ${
        isPrimary ? "p-5" : "p-4"
      }`}
    >
      <span
        className={`absolute left-0 top-0 h-full w-1 ${accent}`}
        aria-hidden
      />

      <div className="flex items-start justify-between gap-3">
        <div
          className={`min-w-0 font-semibold uppercase tracking-[0.08em] text-slate-500 ${
            isPrimary ? "text-[11px]" : "text-[10px]"
          }`}
          title={label}
        >
          {label}
        </div>

        <span
          className={`shrink-0 rounded-full font-bold ring-1 ring-inset ${pillTone} ${
            isPrimary ? "px-3 py-1 text-[13px]" : "px-2.5 py-0.5 text-[12px]"
          }`}
        >
          {unevaluated ? "N/A" : `${score}/${maxScore}`}
        </span>
      </div>

      <div
        className={`w-full overflow-hidden rounded-full bg-slate-100 ${
          isPrimary ? "mt-5 h-2.5" : "mt-4 h-2"
        }`}
      >
        {unevaluated ? (
          <div
            className="h-full w-full"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, #cbd5e1 0 3px, transparent 3px 6px)",
            }}
          />
        ) : (
          <div
            className={`h-full rounded-full ${accent} transition-all`}
            style={{ width: `${Math.max(pct, score > 0 ? 4 : 0)}%` }}
          />
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        {unevaluated ? (
          <span className="text-[11.5px] font-medium text-slate-400">
            Not enough content
          </span>
        ) : isPerfect ? (
          <span className="text-[11.5px] font-medium text-emerald-700">
            All checks passed
          </span>
        ) : isZero ? (
          <span className="text-[11.5px] font-medium text-red-700">
            Nothing detected
          </span>
        ) : hasIssues ? (
          <span className="text-[11.5px] font-medium text-amber-700">
            {issueCount} to fix
          </span>
        ) : (
          <span className="text-[11.5px] font-medium text-slate-400">
            No issues
          </span>
        )}

        <button
          type="button"
          onClick={() => setShowHelp((v) => !v)}
          className="text-[11px] font-medium text-slate-400 transition-colors hover:text-slate-700"
        >
          {showHelp ? "Hide" : "Details"}
        </button>
      </div>

      {showHelp && (
        <p className="mt-3 border-t border-slate-100 pt-3 text-[11.5px] leading-relaxed text-slate-500">
          {help}
        </p>
      )}
    </div>
  );
}

function useBreadcrumb(
  path: string,
  flatPages: NormalizedPage[]
): Array<{ path: string; name: string }> {
  const [crumbs, setCrumbs] = useState<Array<{ path: string; name: string }>>([]);

  useEffect(() => {
    const map = new Map(flatPages.map((p) => [p.path, p]));
    const segments: Array<{ path: string; name: string }> = [];
    let current = path;
    while (current) {
      const found = map.get(current);
      if (found) segments.unshift({ path: found.path, name: found.name });
      const idx = current.lastIndexOf("/");
      if (idx <= 0) break;
      current = current.substring(0, idx);
    }
    setCrumbs(segments);
  }, [path, flatPages]);

  return crumbs;
}

function buildFullReport(report: PageReport, siteAverage: number | null): string {
  const { page, result, language } = report;
  const lines: string[] = [];

  lines.push("SitecoreAI Answer Readiness");
  lines.push("");
  lines.push(`Page: ${page.name}`);
  lines.push(`Path: ${page.path}`);
  lines.push(`Language: ${language}`);
  lines.push("");

  if (result.mode === "scored" && result.score !== null) {
    lines.push(`Score: ${result.score}/100`);
    if (siteAverage !== null) {
      const delta = result.score - siteAverage;
      lines.push(
        `Site average: ${siteAverage}/100 (${delta > 0 ? "+" : ""}${delta})`
      );
    }
  } else {
    lines.push("Status: Not enough content to score");
    for (const d of result.diagnostics) lines.push(`  - ${d}`);
  }
  lines.push("");

  lines.push("Category breakdown:");
  for (const cat of result.categories) {
    lines.push(`  ${cat.label}: ${cat.score}/${cat.maxScore}`);
  }
  lines.push("");

  const actionable = result.findings.filter(
    (f) => f.severity === "error" || f.severity === "warning"
  );
  if (actionable.length > 0) {
    lines.push(`Actionable findings (${actionable.length}):`);
    for (const f of actionable) {
      lines.push(
        `  [${f.severity.toUpperCase()}] ${f.title} (+${f.scoreImpact} pts)`
      );
      lines.push(`    ${f.description}`);
      lines.push(`    Fix: ${f.recommendation}`);
      if (f.suggestion) {
        lines.push(
          `    Suggest: "${f.suggestion.from}" → "${f.suggestion.to}"`
        );
      }
    }
    lines.push("");
  }

  const passed = result.findings.filter((f) => f.severity === "pass");
  if (passed.length > 0) {
    lines.push(`Passed checks (${passed.length}):`);
    for (const f of passed) lines.push(`  ✓ ${f.title}`);
    lines.push("");
  }

  lines.push(`Analyzed: ${new Date(result.analyzedAt).toLocaleString()}`);
  return lines.join("\n");
}

function buildSummaryReport(
  report: PageReport,
  siteAverage: number | null
): string {
  const { page, result } = report;
  const lines: string[] = [];
  lines.push(`Answer Readiness — ${page.name}`);
  if (result.mode === "scored" && result.score !== null) {
    lines.push(`Score: ${result.score}/100`);
    if (siteAverage !== null) {
      const delta = result.score - siteAverage;
      lines.push(
        `Site average: ${siteAverage}/100 (${delta > 0 ? "+" : ""}${delta})`
      );
    }
  } else {
    lines.push("Status: Not enough content to score");
  }
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

function buildChecklist(report: PageReport): string {
  const lines: string[] = [`# Answer Readiness Fixes — ${report.page.name}`, ""];
  for (const cat of report.result.categories) {
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