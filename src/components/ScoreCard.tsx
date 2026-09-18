"use client";

import type { AnalysisResult } from "@/src/types/analysis";

interface Props {
  result: AnalysisResult;
  onReanalyze: () => void;
  loading: boolean;
}

function readinessLabel(score: number) {
  if (score >= 80) return { label: "Good readiness", tone: "text-score-good" };
  if (score >= 60) return { label: "Needs improvement", tone: "text-score-warn" };
  return { label: "Significant gaps", tone: "text-score-bad" };
}

function ringColor(score: number) {
  if (score >= 80) return "#2f9e66";
  if (score >= 60) return "#d98b18";
  return "#d34b4b";
}

export default function ScoreCard({ result, onReanalyze, loading }: Props) {
  const color = ringColor(result.score);
  const { label, tone } = readinessLabel(result.score);

  return (
    <section className="rounded-lg border border-panel-border bg-panel-card p-3.5 shadow-sm">
      <div className="flex items-center gap-3.5">
        {/* Score ring */}
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-[6px] bg-white"
          style={{ borderColor: `${color}33` }}
          aria-label={`Score ${result.score} out of 100`}
        >
          <span className="text-lg font-bold leading-none" style={{ color }}>
            {result.score}
          </span>
        </div>

        {/* Meta */}
        <div className="min-w-0 flex-1">
          <div className={`text-[13px] font-bold ${tone}`}>{label}</div>
          <p className="mt-0.5 text-[10px] leading-relaxed text-panel-muted">
            Internal content-readiness indicator. Not a search-engine ranking
            score.
          </p>
        </div>
      </div>

      <div className="mt-3 flex justify-end">
        <button
          className="rounded-md border border-panel-border bg-white px-3 py-1.5 text-[11px] font-medium text-panel-text transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={onReanalyze}
          disabled={loading}
        >
          {loading ? "Analyzing…" : "Re-analyze"}
        </button>
      </div>
    </section>
  );
}