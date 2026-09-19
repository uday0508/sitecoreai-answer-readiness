"use client";

import type { AnalysisResult, CategoryResult } from "@/src/types/analysis";

interface Props {
  result: AnalysisResult;
  onOpenCategory: (category: string) => void;
}

function scoreColors(score: number, max: number, unevaluated: boolean) {
  if (unevaluated)
    return {
      bar: "bg-slate-300",
      text: "text-slate-500",
      bg: "bg-slate-50/60",
      border: "border-slate-200",
    };
  const ratio = max > 0 ? score / max : 0;
  if (ratio === 1)
    return { bar: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50/40", border: "border-emerald-200" };
  if (ratio >= 0.6)
    return { bar: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50/40", border: "border-amber-200" };
  return { bar: "bg-red-500", text: "text-red-700", bg: "bg-red-50/40", border: "border-red-200" };
}

function topFinding(category: CategoryResult) {
  const actionable = category.findings
    .filter((f) => f.severity === "error" || f.severity === "warning")
    .sort((a, b) => b.scoreImpact - a.scoreImpact);
  return actionable[0] ?? null;
}

export default function CategoryGrid({ result, onOpenCategory }: Props) {
  return (
    <div className="space-y-3">
      <div className="px-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em] text-slate-400">
        Categories
      </div>
      <div className="grid grid-cols-2 gap-2">
        {result.categories.map((cat) => {
          const unevaluated = cat.status === "insufficient-content";
          const colors = scoreColors(cat.score, cat.maxScore, unevaluated);
          const finding = topFinding(cat);
          const isPerfect = cat.score === cat.maxScore && !unevaluated;

          return (
            <button
              key={cat.category}
              type="button"
              onClick={() => onOpenCategory(cat.category)}
              className={`flex flex-col items-start gap-1.5 rounded-xl border ${colors.border} ${colors.bg} p-2.5 text-left transition-colors hover:bg-white`}
            >
              <div className="flex w-full items-start justify-between gap-1">
                <span className={`text-[13px] font-bold ${colors.text}`}>
                  {unevaluated ? (
                    <span className="text-[10px] font-semibold">N/A</span>
                  ) : (
                    <>
                      {cat.score}
                      <span className="text-[9.5px] font-medium text-slate-400">
                        /{cat.maxScore}
                      </span>
                    </>
                  )}
                </span>
                {isPerfect && (
                  <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-2 w-2"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </span>
                )}
                {unevaluated && (
                  <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-slate-200 text-[8.5px] font-bold text-slate-500">
                    ?
                  </span>
                )}
              </div>

              <div className="text-[9.5px] font-bold uppercase tracking-wide text-slate-500">
                {cat.label}
              </div>

              <div className="min-h-[24px] text-[10px] leading-snug text-slate-600">
                {unevaluated
                  ? "Not enough content"
                  : isPerfect
                  ? "All checks passed"
                  : finding
                  ? finding.title
                  : "No issues"}
              </div>

              <div className="h-1 w-full overflow-hidden rounded-full bg-slate-100">
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
                    className={`h-full rounded-full ${colors.bar}`}
                    style={{
                      width: `${Math.round((cat.score / cat.maxScore) * 100)}%`,
                    }}
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}