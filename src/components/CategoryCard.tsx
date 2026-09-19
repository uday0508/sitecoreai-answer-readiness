"use client";

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
  const ordered = [...actionable, ...passed];

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <header className="flex items-center justify-between gap-2 border-b border-slate-100 px-3.5 py-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-700">
          {category.label}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset ${scorePill(
            category.score,
            category.maxScore
          )}`}
        >
          {category.score}/{category.maxScore}
        </span>
      </header>

      <div className="divide-y divide-slate-100">
        {ordered.map((finding) => (
          <div key={finding.id} className="px-3.5 py-2.5">
            <div className="flex items-start gap-2">
              <span
                className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${severityDot(
                  finding.severity
                )}`}
              />
              <div className="min-w-0 flex-1">
                <div className="text-[11.5px] font-semibold leading-snug text-slate-900">
                  {finding.title}
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                  {finding.description}
                </p>
                {finding.severity !== "pass" && (
                  <p className="mt-1 text-[11px] italic leading-relaxed text-slate-500">
                    {finding.recommendation}
                  </p>
                )}
                {finding.evidence?.value && (
                  <span className="mt-1.5 inline-block max-w-full truncate rounded-md bg-slate-50 px-1.5 py-0.5 font-mono text-[9.5px] text-slate-500 ring-1 ring-inset ring-slate-100">
                    {finding.evidence.source}: {finding.evidence.value.slice(0, 90)}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}