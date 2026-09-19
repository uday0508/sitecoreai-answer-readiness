"use client";

import { useState } from "react";
import type { CategoryResult, AnalysisFinding } from "@/src/types/analysis";

interface Props {
  category: CategoryResult;
}

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

export default function CategoryCard({ category }: Props) {
  const actionable = category.findings.filter((f) => f.severity !== "pass");
  const passed = category.findings.filter((f) => f.severity === "pass");
  const isAllPass = actionable.length === 0 && category.status === "evaluated";
  const isInsufficient = category.status === "insufficient-content";
  const [expanded, setExpanded] = useState(!isAllPass);

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
            <span className="text-[9.5px] font-medium text-slate-500">
              not scoreable
            </span>
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
          {ordered.map((finding) => (
            <div key={finding.id} className="px-3 py-2.5">
              <div className="flex items-start gap-2">
                <span
                  className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${severityDot(
                    finding.severity
                  )}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-semibold leading-snug text-slate-900">
                    {finding.title}
                  </div>
                  <p className="mt-0.5 text-[10.5px] leading-relaxed text-slate-600">
                    {finding.description}
                  </p>
                  {finding.severity !== "pass" && (
                    <p className="mt-0.5 text-[10.5px] italic leading-relaxed text-slate-500">
                      {finding.recommendation}
                    </p>
                  )}
                  {finding.evidence?.value && (
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