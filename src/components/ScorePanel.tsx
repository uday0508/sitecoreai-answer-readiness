"use client";

import { useState } from "react";
import type { AnalysisResult, AnalysisDiff } from "@/src/types/analysis";

interface Props {
  result: AnalysisResult;
  diff?: AnalysisDiff | null;
  activeTab?: "priority" | "overview";
  onTabChange?: (tab: "priority" | "overview") => void;
  hideTabs?: boolean;
}

const READINESS_TOOLTIPS: Record<string, string> = {
  "Good readiness":
    "The page contains most of the AEO/GEO signals AI answer engines look for.",
  "Needs improvement":
    "Some signals are missing. The page can be more answer-extractable before publishing.",
  "Significant gaps":
    "Multiple AEO/GEO signals are missing. AI answer engines may not extract usable content.",
  "Not answer-ready":
    "Critical content structure is missing. The page is unlikely to be extractable as an answer.",
};

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

function nextTierInfo(score: number) {
  if (score >= 80) return null;
  if (score >= 60) return { target: "Good readiness", gap: 80 - score };
  if (score >= 35) return { target: "Needs improvement", gap: 60 - score };
  return { target: "Significant gaps", gap: 35 - score };
}

export default function ScorePanel({
  result,
  diff,
  activeTab = "priority",
  onTabChange,
  hideTabs = false,
}: Props) {
  const [showLabelTooltip, setShowLabelTooltip] = useState(false);

  const score = result.score ?? 0;
  const { label, tone, stroke } = readinessMeta(score);
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const isLow = score < 35;

  const criticalCount = result.findings.filter(
    (f) => f.severity === "error"
  ).length;
  const warningCount = result.findings.filter(
    (f) => f.severity === "warning"
  ).length;
  const totalActionable = criticalCount + warningCount;

  const tier = nextTierInfo(score);
  const delta = diff?.scoreDelta ?? null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-center gap-3.5">
        <div className="relative h-[62px] w-[62px] shrink-0">
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
            <span className="text-[16px] font-bold leading-none text-slate-900">
              {score}
            </span>
            <span className="mt-0.5 text-[8.5px] font-medium text-slate-400">
              /100
            </span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <div
              className="relative"
              onMouseEnter={() => setShowLabelTooltip(true)}
              onMouseLeave={() => setShowLabelTooltip(false)}
            >
              <span
                className={`cursor-help border-b border-dotted border-current text-[12.5px] font-semibold ${tone}`}
              >
                {label}
              </span>
              {showLabelTooltip && (
                <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-lg border border-slate-200 bg-white p-2 text-[10px] leading-relaxed text-slate-600 shadow-lg">
                  {READINESS_TOOLTIPS[label]}
                </div>
              )}
            </div>
            {delta !== null && delta !== 0 && (
              <span
                className={`flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[9.5px] font-semibold ${delta > 0
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-700"
                  }`}
                title={`${delta > 0 ? "+" : ""}${delta} vs previous analysis`}
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
            {criticalCount > 0 && `${criticalCount} critical`}
            {criticalCount > 0 && warningCount > 0 && " · "}
            {warningCount > 0 && `${warningCount} important`}
            {totalActionable === 0 && "No issues detected"}
          </p>
          {isLow && tier && (
            <p className="mt-0.5 text-[10px] font-medium text-red-700">
              +{tier.gap} pts to reach "{tier.target}"
            </p>
          )}
        </div>
      </div>

      {diff &&
        diff.entries.length > 0 &&
        (diff.resolvedCount > 0 || diff.newCount > 0) && (
          <div className="mt-2.5 flex items-center gap-3 border-t border-slate-100 pt-2.5">
            {diff.resolvedCount > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {diff.resolvedCount} resolved
              </span>
            )}
            {diff.newCount > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-medium text-amber-700">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                {diff.newCount} new
              </span>
            )}
            {diff.unchangedCount > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-medium text-slate-500">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                {diff.unchangedCount} unchanged
              </span>
            )}
          </div>
        )}

      {!hideTabs && onTabChange && (
        <div className="mt-3 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-0.5">
          <button
            type="button"
            onClick={() => onTabChange("priority")}
            className={`rounded-md py-1.5 text-[10.5px] font-semibold transition-colors ${activeTab === "priority"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
              }`}
          >
            Priority
          </button>
          <button
            type="button"
            onClick={() => onTabChange("overview")}
            className={`rounded-md py-1.5 text-[10.5px] font-semibold transition-colors ${activeTab === "overview"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
              }`}
          >
            Overview
          </button>
        </div>
      )}

      <div className="mt-3.5 flex items-baseline justify-between border-t border-slate-100 pt-3">
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
                title={
                  unevaluated
                    ? `${cat.label}: not enough content to evaluate`
                    : `${cat.label}: ${cat.score}/${cat.maxScore}`
                }
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