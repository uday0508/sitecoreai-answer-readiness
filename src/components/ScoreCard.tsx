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
  if (score >= 35)
    return { label: "Significant gaps", tone: "text-orange-600", stroke: "#ea580c" };
  return { label: "Not answer-ready", tone: "text-red-600", stroke: "#dc2626" };
}

export default function ScoreCard({ result }: Props) {
  const score = result.score ?? 0;
  const { label, tone, stroke } = readinessMeta(score);
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const actionableCount = result.findings.filter(
    (f) => f.severity === "warning" || f.severity === "error"
  ).length;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-center gap-3.5">
        <div className="relative h-[62px] w-[62px] shrink-0">
          <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
            <circle cx="32" cy="32" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="4" />
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
            <span className="text-[16px] font-bold leading-none text-slate-900">
              {score}
            </span>
            <span className="mt-0.5 text-[8.5px] font-medium text-slate-400">/100</span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className={`text-[12.5px] font-semibold ${tone}`}>{label}</div>
          <p className="mt-0.5 text-[10px] leading-snug text-slate-500">
            {actionableCount > 0
              ? `${actionableCount} issue${actionableCount === 1 ? "" : "s"} to fix`
              : "No issues detected"}
          </p>
        </div>
      </div>
    </section>
  );
}