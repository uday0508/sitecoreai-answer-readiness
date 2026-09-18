"use client";

import type { CategoryResult, AnalysisFinding } from "@/src/types/analysis";

interface Props {
  category: CategoryResult;
}

function severityDot(severity: AnalysisFinding["severity"]) {
  switch (severity) {
    case "pass":
      return "bg-score-good";
    case "warning":
      return "bg-score-warn";
    case "error":
      return "bg-score-bad";
    default:
      return "bg-slate-400";
  }
}

function scoreTone(score: number, max: number) {
  if (score === max) return "bg-emerald-100 text-emerald-800";
  if (score >= max * 0.6) return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-800";
}

export default function CategoryCard({ category }: Props) {
  return (
    <section className="rounded-lg border border-panel-border bg-panel-card p-3.5 shadow-sm">
      <header className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-panel-text">
          {category.label}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${scoreTone(
            category.score,
            category.maxScore
          )}`}
        >
          {category.score}/{category.maxScore}
        </span>
      </header>

      <div className="mt-2 divide-y divide-slate-100">
        {category.findings.map((finding) => (
          <div key={finding.id} className="py-2.5 first:pt-1.5 last:pb-0">
            <div className="flex items-start gap-2">
              <span
                className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${severityDot(
                  finding.severity
                )}`}
              />
              <div className="min-w-0 flex-1">
                <div className="text-[11.5px] font-semibold leading-snug text-panel-text">
                  {finding.title}
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-panel-muted">
                  {finding.description}
                </p>
                <p className="mt-1 text-[11px] italic leading-relaxed text-slate-600">
                  {finding.recommendation}
                </p>
                {finding.evidence?.value && (
                  <span className="mt-1.5 inline-block max-w-full truncate rounded bg-slate-100 px-1.5 py-0.5 text-[9.5px] text-panel-muted">
                    {finding.evidence.source}:{" "}
                    {finding.evidence.value.slice(0, 100)}
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