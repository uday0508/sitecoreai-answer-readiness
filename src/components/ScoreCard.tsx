"use client";

import type { AnalysisResult } from "@/src/types/analysis";

interface Props {
  result: AnalysisResult;
  onReanalyze: () => void;
  loading: boolean;
}

function readinessMeta(score: number) {
  if (score >= 80)
    return { label: "Good readiness", tone: "text-emerald-600", stroke: "#059669" };
  if (score >= 60)
    return { label: "Needs improvement", tone: "text-amber-600", stroke: "#d97706" };
  return { label: "Significant gaps", tone: "text-red-600", stroke: "#dc2626" };
}

export default function ScoreCard({ result, onReanalyze, loading }: Props) {
  const { label, tone, stroke } = readinessMeta(result.score);
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (result.score / 100) * circumference;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-center gap-4">
        {/* SVG score ring */}
        <div className="relative h-[68px] w-[68px] shrink-0">
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
            <span className="text-[17px] font-bold leading-none text-slate-900">
              {result.score}
            </span>
            <span className="mt-0.5 text-[9px] font-medium text-slate-400">
              /100
            </span>
          </div>
        </div>

        {/* Meta */}
        <div className="min-w-0 flex-1">
          <div className={`text-[13px] font-semibold ${tone}`}>{label}</div>
          <p className="mt-1 text-[10.5px] leading-relaxed text-slate-500">
            Internal content-readiness indicator. Not a search-engine ranking
            score.
          </p>
        </div>
      </div>

      <div className="mt-3.5 flex justify-end">
        <button
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={onReanalyze}
          disabled={loading}
        >
          {loading ? "Analyzing…" : "Re-analyze"}
        </button>
      </div>
    </section>
  );
}