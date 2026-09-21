"use client";

import type { AnalysisResult, AnalysisDiff } from "@/src/types/analysis";

interface Props {
  result: AnalysisResult;
  previousScore?: number | null;
  diff?: AnalysisDiff | null;
}

function readinessMeta(score: number) {
  if (score >= 80)
    return {
      label: "Good readiness",
      tone: "text-emerald-600",
      stroke: "#059669",
    };
  if (score >= 60)
    return {
      label: "Needs improvement",
      tone: "text-amber-600",
      stroke: "#d97706",
    };
  if (score >= 35)
    return {
      label: "Significant gaps",
      tone: "text-orange-600",
      stroke: "#ea580c",
    };
  return {
    label: "Not answer-ready",
    tone: "text-red-600",
    stroke: "#dc2626",
  };
}

export default function ScoreCard({ result, previousScore, diff }: Props) {
  const score = result.score ?? 0;
  const { label, tone, stroke } = readinessMeta(score);
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const actionableCount = result.findings.filter(
    (f) => f.severity === "warning" || f.severity === "error"
  ).length;

  const delta =
    diff?.scoreDelta ??
    (typeof previousScore === "number" && previousScore !== null
      ? score - previousScore
      : null);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col items-center gap-2.5">
        {/* Score ring */}
        <div className="relative h-[70px] w-[70px] shrink-0">
          <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
            <circle
              cx="32"
              cy="32"
              r={radius}
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="4"
            />
            <circle
              cx="32"
              cy="32"
              r={radius}
              fill="none"
              stroke={stroke}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 500ms ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[18px] font-bold leading-none text-slate-900">
              {result.score}
            </span>
            <span className="mt-0.5 text-[9px] font-medium text-slate-400">
              /100
            </span>
          </div>
        </div>

        {/* Label and note, centered */}
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-1.5">
            <span className={`text-[13px] font-semibold ${tone}`}>{label}</span>
            {delta !== null && delta !== 0 && (
              <span
                className={`flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[9.5px] font-semibold ${delta > 0
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-700"
                  }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`h-2.5 w-2.5 ${delta < 0 ? "rotate-180" : ""}`}
                >
                  <path d="M12 19V5" />
                  <path d="m5 12 7-7 7 7" />
                </svg>
                {delta > 0 ? "+" : ""}
                {delta}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[10px] leading-snug text-slate-500">
            {actionableCount > 0
              ? `${actionableCount} issue${actionableCount === 1 ? "" : "s"
              } to fix`
              : "No issues detected"}
          </p>
        </div>
      </div>

      {/* Category breakdown */}
      {/* Category breakdown */}
      <div className="mt-4 flex items-baseline justify-between border-t border-slate-100 pt-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
          Category breakdown
        </span>
        <span className="text-[9.5px] text-slate-400">100 points total</span>
      </div>
      <div className="mt-2 space-y-1.5">
        {result.categories.map((cat) => {
          const ratio = cat.maxScore > 0 ? cat.score / cat.maxScore : 0;
          const unevaluated = cat.status === "insufficient-content";
          const barColor = unevaluated
            ? "bg-slate-300"
            : ratio === 1
              ? "bg-emerald-500"
              : ratio >= 0.6
                ? "bg-amber-500"
                : "bg-red-500";
          const valueColor = unevaluated
            ? "text-slate-400"
            : ratio === 1
              ? "text-emerald-700"
              : ratio >= 0.6
                ? "text-amber-700"
                : "text-red-700";

          return (
            <div key={cat.category} className="flex items-center gap-2">
              <span
                className="w-[104px] shrink-0 truncate text-[10.5px] font-medium text-slate-700"
                title={cat.label}
              >
                {cat.label}
              </span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
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
                    className={`h-full rounded-full ${barColor}`}
                    style={{
                      width: `${Math.max(
                        Math.round(ratio * 100),
                        cat.score > 0 ? 3 : 0
                      )}%`,
                    }}
                  />
                )}
              </div>
              <span
                className={`w-10 shrink-0 text-right text-[10.5px] font-semibold tabular-nums ${valueColor}`}
                title={`${cat.score} of ${cat.maxScore}`}
              >
                {unevaluated ? "N/A" : `${cat.score}/${cat.maxScore}`}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}