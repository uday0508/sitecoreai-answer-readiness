"use client";

import type { AnalysisResult, AnalysisFinding } from "@/src/types/analysis";

interface Props {
  result: AnalysisResult;
  onExpandCategory: (category: string) => void;
  severityFilter?: "all" | "error" | "warning";
}

const SEVERITY_RANK: Record<AnalysisFinding["severity"], number> = {
  error: 0,
  warning: 1,
  info: 2,
  pass: 3,
};

export default function PriorityCard({
  result,
  onExpandCategory,
  severityFilter = "all",
}: Props) {
  const candidates = result.findings.filter((f) => {
    if (severityFilter === "error") return f.severity === "error";
    if (severityFilter === "warning") return f.severity === "warning";
    return f.severity === "error" || f.severity === "warning";
  });

  const top = [...candidates]
    .sort((a, b) => {
      const s = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
      if (s !== 0) return s;
      return b.scoreImpact - a.scoreImpact;
    })
    .slice(0, 3);

  if (top.length === 0) return null;

  const label =
    severityFilter === "error"
      ? "Critical issues"
      : severityFilter === "warning"
      ? "Warnings to address"
      : "Fix these first";

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
          {label}
        </span>
        <span className="text-[9.5px] font-medium text-slate-400">
          {top.length} of {candidates.length}
        </span>
      </div>

      <ol className="mt-2 space-y-1.5">
        {top.map((finding, index) => (
          <li key={finding.id}>
            <button
              type="button"
              onClick={() => onExpandCategory(finding.category)}
              className="flex w-full items-start gap-2 rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-slate-50"
            >
              <span
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                  finding.severity === "error"
                    ? "bg-red-100 text-red-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11px] font-semibold text-slate-900">
                  {finding.title}
                </span>
                <span className="mt-0.5 block text-[10px] leading-snug text-slate-500">
                  {finding.recommendation}
                </span>
              </span>
              <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-600">
                +{finding.scoreImpact}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}