"use client";

import { useEffect, useState } from "react";
import type { CategoryResult, AnalysisFinding } from "@/src/types/analysis";

interface Props {
  category: CategoryResult;
  dismissedIds: Set<string>;
  onDismiss: (id: string) => void;
  onRestore: (id: string) => void;
  onBack: () => void;
}

const CATEGORY_HELP: Record<string, string> = {
  "answer-structure":
    "AI systems extract direct answers from headings and opening paragraphs.",
  "passage-integrity":
    "AI retrieves passages, not pages. Context-dependent fragments break.",
  "factual-density":
    "Concrete claims — numbers, dates, comparisons — are quoted preferentially.",
  "entity-clarity":
    "Clear entity definition and authorship help AI attribute claims.",
  "faq-readiness":
    "FAQPage schema mirrors Q&A extraction, the strongest citation signal.",
};

const LEVEL_LABEL: Record<string, string> = {
  page: "Page",
  layout: "Layout",
  component: "Component",
  unknown: "",
};

function severityDot(severity: AnalysisFinding["severity"]) {
  switch (severity) {
    case "pass": return "bg-emerald-500";
    case "warning": return "bg-amber-500";
    case "error": return "bg-red-500";
    default: return "bg-slate-300";
  }
}

function scoreTone(score: number, max: number) {
  if (score === max) return "text-emerald-700";
  if (score >= max * 0.6) return "text-amber-700";
  return "text-red-700";
}

export default function CategoryDetail({
  category,
  dismissedIds,
  onDismiss,
  onRestore,
  onBack,
}: Props) {
  const [showDismissed, setShowDismissed] = useState(false);

  const visible = category.findings.filter((f) => !dismissedIds.has(f.id));
  const dismissed = category.findings.filter((f) => dismissedIds.has(f.id));
  const actionable = visible.filter((f) => f.severity !== "pass");
  const passed = visible.filter((f) => f.severity === "pass");
  const ordered = [...actionable, ...passed];

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-[11px] font-medium text-slate-500 transition-colors hover:text-slate-900"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3 w-3"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
        Back to overview
      </button>

      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              {category.label}
            </div>
            <p className="mt-0.5 text-[10.5px] italic leading-relaxed text-slate-500">
              {CATEGORY_HELP[category.category]}
            </p>
          </div>
          <span className={`shrink-0 text-[18px] font-bold ${scoreTone(category.score, category.maxScore)}`}>
            {category.score}
            <span className="text-[11px] font-medium text-slate-400">/{category.maxScore}</span>
          </span>
        </div>
      </div>

      {ordered.map((finding) => (
        <div
          key={finding.id}
          className="group rounded-xl border border-slate-200 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
        >
          <div className="flex items-start gap-2">
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${severityDot(finding.severity)}`} />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1 text-[11.5px] font-semibold leading-snug text-slate-900">
                  {finding.title}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {finding.level && finding.level !== "unknown" && (
                    <span className="rounded bg-slate-100 px-1 py-0.5 text-[8.5px] font-medium uppercase tracking-wide text-slate-600">
                      {LEVEL_LABEL[finding.level]}
                    </span>
                  )}
                  {finding.severity !== "pass" && (
                    <button
                      type="button"
                      onClick={() => onDismiss(finding.id)}
                      className="rounded p-0.5 text-slate-300 opacity-0 transition-opacity hover:bg-slate-100 hover:text-slate-500 group-hover:opacity-100"
                      title="Dismiss for this session"
                      aria-label="Dismiss finding"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              <p className="mt-1 text-[10.5px] leading-relaxed text-slate-600">
                {finding.description}
              </p>

              {finding.severity !== "pass" && (
                <p className="mt-1 text-[10.5px] italic leading-relaxed text-slate-500">
                  {finding.recommendation}
                </p>
              )}

              {finding.samples && finding.samples.length > 0 && (
                <div className="mt-2">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    Samples
                  </div>
                  <ul className="mt-1 space-y-0.5">
                    {finding.samples.map((sample, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-1.5 rounded-md bg-slate-50 px-2 py-1 ring-1 ring-inset ring-slate-100"
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
                </div>
              )}

              {finding.suggestion && (
                <div className="mt-2 rounded-md border border-emerald-100 bg-emerald-50/60 p-2">
                  <div className="text-[9px] font-bold uppercase tracking-wide text-emerald-700">
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
                  {finding.suggestion.rationale && (
                    <p className="mt-1 text-[9.5px] italic text-emerald-700/80">
                      {finding.suggestion.rationale}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      {dismissed.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
          <button
            type="button"
            onClick={() => setShowDismissed((v) => !v)}
            className="flex w-full items-center justify-between text-[10px] font-medium text-slate-500"
          >
            <span>{dismissed.length} dismissed this session</span>
            <span className="text-slate-400">{showDismissed ? "Hide" : "Show"}</span>
          </button>
          {showDismissed && (
            <div className="mt-2 space-y-1">
              {dismissed.map((finding) => (
                <div
                  key={finding.id}
                  className="flex items-start justify-between gap-2 text-[10px] text-slate-500"
                >
                  <span className="min-w-0 flex-1 truncate">{finding.title}</span>
                  <button
                    type="button"
                    onClick={() => onRestore(finding.id)}
                    className="shrink-0 text-[10px] font-medium text-blue-600 hover:underline"
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}