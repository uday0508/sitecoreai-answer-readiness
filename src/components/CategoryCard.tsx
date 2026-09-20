"use client";

import { useEffect, useState } from "react";
import type {
  CategoryResult,
  AnalysisFinding,
  FindingSeverity,
} from "@/src/types/analysis";
import type { SeverityFilter } from "./AnswerReadinessPanel";

interface Props {
  category: CategoryResult;
  forceExpanded?: boolean;
  severityFilter: SeverityFilter;
}

const CATEGORY_HELP: Record<string, string> = {
  "answer-structure":
    "AI systems extract direct answers from headings and opening paragraphs. Question-form headings map cleanly to how users ask.",
  "passage-integrity":
    "AI retrieves passages, not pages. If a section depends on the one above it, the extracted fragment becomes unusable.",
  "factual-density":
    "Concrete claims — numbers, dates, comparisons — are preferentially quoted by AI answer engines over vague prose.",
  "entity-clarity":
    "Clear entity definition and authorship signals help AI attribute claims to the right source.",
  "faq-readiness":
    "FAQPage schema is the one structured data type consistently correlated with AI citation because it mirrors Q&A extraction.",
};

const LEVEL_LABEL: Record<string, string> = {
  page: "Page settings",
  layout: "Layout",
  component: "Component",
  unknown: "",
};

function severityDot(severity: FindingSeverity) {
  switch (severity) {
    case "pass": return "bg-emerald-500";
    case "warning": return "bg-amber-500";
    case "error": return "bg-red-500";
    default: return "bg-slate-300";
  }
}

function severityChip(severity: FindingSeverity) {
  switch (severity) {
    case "pass": return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "warning": return "bg-amber-50 text-amber-700 ring-amber-200";
    case "error": return "bg-red-50 text-red-700 ring-red-200";
    default: return "bg-slate-50 text-slate-600 ring-slate-200";
  }
}

function severityLabel(severity: FindingSeverity) {
  switch (severity) {
    case "pass": return "Pass";
    case "warning": return "Warning";
    case "error": return "Error";
    default: return "Info";
  }
}

function scorePill(score: number, max: number) {
  if (score === max) return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (score >= max * 0.6) return "bg-amber-50 text-amber-700 ring-amber-200";
  return "bg-red-50 text-red-700 ring-red-200";
}

function filterFindings(
  findings: AnalysisFinding[],
  filter: SeverityFilter
): AnalysisFinding[] {
  if (filter === "all") return findings;
  if (filter === "pass") return findings.filter((f) => f.severity === "pass");
  if (filter === "error") return findings.filter((f) => f.severity === "error");
  if (filter === "warning") return findings.filter((f) => f.severity === "warning");
  return findings;
}

export default function CategoryCard({
  category,
  forceExpanded,
  severityFilter,
}: Props) {
  const filtered = filterFindings(category.findings, severityFilter);

  const isInsufficient = category.status === "insufficient-content";
  const isAllPass =
    category.status === "evaluated" &&
    category.findings.every((f) => f.severity === "pass");

  const headerActionableCount = filtered.filter(
    (f) => f.severity !== "pass"
  ).length;

  const noMatches = filtered.length === 0;

  const [expanded, setExpanded] = useState(!isAllPass);

  useEffect(() => {
    if (forceExpanded) setExpanded(true);
  }, [forceExpanded]);

  useEffect(() => {
    if (severityFilter !== "all") setExpanded(true);
  }, [severityFilter]);

  const actionable = filtered.filter((f) => f.severity !== "pass");
  const passed = filtered.filter((f) => f.severity === "pass");
  const ordered = [...actionable, ...passed];

  return (
    <section      className={`overflow-hidden rounded-xl border bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${
        isInsufficient
          ? "border-slate-200"
          : isAllPass
          ? "border-slate-100 opacity-70"
          : "border-slate-200"
      }`}
    >
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors hover:bg-slate-50"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
              isInsufficient
                ? "bg-slate-300"
                : isAllPass
                ? "bg-emerald-500"
                : "bg-amber-500"
            }`}
          />
          <span className="truncate text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-700">
            {category.label}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isInsufficient ? (
            <span className="text-[9.5px] font-medium text-slate-500">not scoreable</span>
          ) : (
            <>
              {noMatches ? (
                <span className="text-[9.5px] font-medium text-slate-400">
                  no matches
                </span>
              ) : (
                !isAllPass &&
                headerActionableCount > 0 && (
                  <span className="text-[9.5px] font-medium text-amber-600">
                    {headerActionableCount} to fix
                  </span>
                )
              )}
              <span
                className={`rounded-full px-2 py-0.5 text-[9.5px] font-bold ring-1 ring-inset ${scorePill(
                  category.score,
                  category.maxScore
                )}`}
              >
                {category.score}/{category.maxScore}
              </span>
            </>
          )}
        </div>
      </button>

      {expanded && (
        <div className="divide-y divide-slate-100 border-t border-slate-100">
          {CATEGORY_HELP[category.category] && (
            <div className="bg-slate-50/60 px-3 py-2">
              <p className="text-[10px] italic leading-relaxed text-slate-500">
                {CATEGORY_HELP[category.category]}
              </p>
            </div>
          )}

          {ordered.length === 0 && (
            <div className="px-3 py-3 text-[11px] text-slate-500">
              No findings match the current filter in this category.
            </div>
          )}

          {ordered.map((finding) => (
            <FindingRow key={finding.id} finding={finding} />
          ))}
        </div>
      )}
    </section>
  );
}

function FindingRow({ finding }: { finding: AnalysisFinding }) {
  const [showWhy, setShowWhy] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = [
      finding.title,
      "",
      finding.description,
      "",
      `Fix: ${finding.recommendation}`,
      finding.suggestion
        ? `\nReplace: "${finding.suggestion.from}" → "${finding.suggestion.to}"`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be blocked in the iframe; silently ignore.
    }
  };

  return (
    <div className="group px-3 py-2.5">
      <div className="flex items-start gap-2">
        <span
          className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${severityDot(
            finding.severity
          )}`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold leading-snug text-slate-900">
              {finding.title}
            </span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ring-1 ring-inset ${severityChip(
                finding.severity
              )}`}
            >
              {severityLabel(finding.severity)}
            </span>
            {finding.level && finding.level !== "unknown" && (
              <span className="rounded bg-slate-100 px-1 py-0.5 text-[8.5px] font-medium uppercase tracking-wide text-slate-600">
                {LEVEL_LABEL[finding.level]}
              </span>
            )}

            {finding.severity !== "pass" && (
              <button
                type="button"
                onClick={handleCopy}
                title="Copy fix"
                aria-label="Copy fix"
                className="ml-auto rounded p-0.5 text-slate-300 opacity-0 transition-opacity hover:bg-slate-100 hover:text-slate-700 group-hover:opacity-100"
              >
                {copied ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 text-emerald-600">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                  </svg>
                )}
              </button>
            )}
          </div>

          <p className="mt-1 text-[10.5px] leading-relaxed text-slate-600">
            {finding.description}
          </p>

          {finding.severity !== "pass" && (
            <p className="mt-1 text-[10.5px] italic leading-relaxed text-slate-500">
              {finding.recommendation}
            </p>
          )}

          {finding.severity !== "pass" && (
            <div className="mt-1.5">
              <button
                type="button"
                onClick={() => setShowWhy((v) => !v)}
                className="text-[10px] font-medium text-slate-400 transition-colors hover:text-slate-700"
              >
                {showWhy ? "Hide why this matters" : "Why this matters"}
              </button>
              {showWhy && (
                <p className="mt-1 rounded-md bg-slate-50 px-2 py-1.5 text-[10.5px] leading-relaxed text-slate-600 ring-1 ring-inset ring-slate-100">
                  AI answer engines extract short passages and cite them as
                  answers. A finding like this means the page is harder to
                  extract cleanly, which reduces the chance that it will be
                  selected as a source.
                </p>
              )}
            </div>
          )}

          {finding.samples && finding.samples.length > 0 && (
            <ul className="mt-1.5 space-y-0.5">
              {finding.samples.map((sample, i) => (
                <li
                  key={i}
                  className="flex items-start gap-1.5 rounded-md bg-slate-50 px-1.5 py-1 ring-1 ring-inset ring-slate-100"
                >
                  <span className="mt-0.5 text-[8.5px] font-semibold uppercase text-slate-400">
                    {sample.kind}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-mono text-[9.5px] text-slate-600">
                    {sample.value}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {finding.suggestion && (
            <div className="mt-1.5 rounded-md border border-emerald-100 bg-emerald-50/60 p-2">
              <div className="text-[9px] font-semibold uppercase tracking-wide text-emerald-700">
                Suggest rewrite
              </div>
              <div className="mt-1 space-y-0.5">
                <div className="flex items-start gap-1">
                  <span className="mt-0.5 text-[9px] font-bold text-red-500">−</span>
                  <span className="text-[10.5px] text-slate-500 line-through">
                    {finding.suggestion.from}
                  </span>
                </div>
                <div className="flex items-start gap-1">
                  <span className="mt-0.5 text-[9px] font-bold text-emerald-600">+</span>
                  <span className="text-[10.5px] font-medium text-slate-800">
                    {finding.suggestion.to}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}