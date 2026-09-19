"use client";

import { useEffect, useState } from "react";
import type { CategoryResult, AnalysisFinding } from "@/src/types/analysis";

interface Props {
  category: CategoryResult;
  forceExpanded?: boolean;
  dismissedIds: Set<string>;
  onDismiss: (findingId: string) => void;
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
  page: "Page settings",
  layout: "Layout",
  component: "Component",
  unknown: "",
};

const LEVEL_COLOR: Record<string, string> = {
  page: "bg-slate-100 text-slate-600",
  layout: "bg-slate-100 text-slate-600",
  component: "bg-slate-100 text-slate-600",
  unknown: "",
};

function severityDot(severity: AnalysisFinding["severity"]) {
  switch (severity) {
    case "pass":
      return "bg-emerald-500";
    case "warning":
      return "bg-amber-500";
    case "error":
      return "bg-red-500";
    default:
      return "bg-slate-300";
  }
}

function scorePill(score: number, max: number) {
  if (score === max) return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (score >= max * 0.6) return "bg-amber-50 text-amber-700 ring-amber-200";
  return "bg-red-50 text-red-700 ring-red-200";
}

export default function CategoryCard({
  category,
  forceExpanded,
  dismissedIds,
  onDismiss,
}: Props) {
  const visibleFindings = category.findings.filter((f) => !dismissedIds.has(f.id));
  const actionable = visibleFindings.filter((f) => f.severity !== "pass");
  const passed = visibleFindings.filter((f) => f.severity === "pass");
  const isAllPass = actionable.length === 0 && category.status === "evaluated";
  const isInsufficient = category.status === "insufficient-content";
  const [expanded, setExpanded] = useState(!isAllPass);

  useEffect(() => {
    if (forceExpanded) setExpanded(true);
  }, [forceExpanded]);

  const ordered = [...actionable, ...passed];

  return (
    <section
      className={`overflow-hidden rounded-xl border bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${
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
              isInsufficient ? "bg-slate-300" : isAllPass ? "bg-emerald-500" : "bg-amber-500"
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
              {!isAllPass && (
                <span className="text-[9.5px] font-medium text-amber-600">
                  {actionable.length} to fix
                </span>
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

          {ordered.map((finding) => (
            <div key={finding.id} className="group px-3 py-2.5">
              <div className="flex items-start gap-2">
                <span
                  className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${severityDot(
                    finding.severity
                  )}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1 text-[11px] font-semibold leading-snug text-slate-900">
                      {finding.title}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {finding.level && finding.level !== "unknown" && (
                        <span
                          className={`rounded px-1 py-0.5 text-[8.5px] font-medium uppercase tracking-wide ${LEVEL_COLOR[finding.level]}`}
                        >
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
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-3 w-3"
                          >
                            <path d="M18 6 6 18" />
                            <path d="m6 6 12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="mt-0.5 text-[10.5px] leading-relaxed text-slate-600">
                    {finding.description}
                  </p>

                  {finding.severity !== "pass" && (
                    <p className="mt-0.5 text-[10.5px] italic leading-relaxed text-slate-500">
                      {finding.recommendation}
                    </p>
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
                      {finding.suggestion.rationale && (
                        <p className="mt-1 text-[9.5px] italic text-emerald-700/80">
                          {finding.suggestion.rationale}
                        </p>
                      )}
                    </div>
                  )}

                  {finding.evidence?.value && !finding.samples?.length && (
                    <span className="mt-1 inline-block max-w-full truncate rounded-md bg-slate-50 px-1.5 py-0.5 font-mono text-[9px] text-slate-500 ring-1 ring-inset ring-slate-100">
                      {finding.evidence.source}: {finding.evidence.value.slice(0, 80)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}