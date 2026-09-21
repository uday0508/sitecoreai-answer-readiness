"use client";

import { useEffect, useState } from "react";

interface AnalysisFinding {
  id: string;
  severity: "pass" | "info" | "warning" | "error";
  title: string;
  description: string;
  recommendation: string;
  scoreImpact: number;
}

interface CategoryResult {
  category: string;
  label: string;
  score: number;
  maxScore: number;
}

interface AnalysisResult {
  mode: "scored" | "diagnostic";
  score: number | null;
  categories: CategoryResult[];
  findings: AnalysisFinding[];
}

export default function SelfAnalysis() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/self-analyze")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Analysis failed"))))
      .then((data: AnalysisResult) => {
        if (!cancelled) setResult(data);
      })
      .catch(() => {
        if (!cancelled) setError("This page could not be analyzed.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-[14px] text-slate-500">{error}</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="animate-pulse space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-6">
          <div className="h-24 w-24 rounded-full bg-slate-100" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-40 rounded bg-slate-100" />
            <div className="h-3 w-64 rounded bg-slate-100" />
            <div className="h-3 w-48 rounded bg-slate-100" />
          </div>
        </div>
        <div className="space-y-2 pt-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-2 w-full rounded bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  if (result.mode === "diagnostic" || result.score === null) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-6">
        <div className="text-[13px] font-semibold uppercase tracking-[0.08em] text-amber-700">
          Not enough content to score
        </div>
        <p className="mt-2 text-[14px] leading-relaxed text-amber-900">
          Even this page does not contain enough answer-oriented content to
          produce a meaningful score. That is the point of the tool.
        </p>
      </div>
    );
  }

  const score = result.score;
  const stroke =
    score >= 80 ? "#059669" : score >= 60 ? "#d97706" : "#dc2626";
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const actionable = result.findings
    .filter((f) => f.severity === "error" || f.severity === "warning")
    .sort((a, b) => b.scoreImpact - a.scoreImpact)
    .slice(0, 3);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        <div className="relative h-[96px] w-[96px] shrink-0">
          <svg viewBox="0 0 96 96" className="h-full w-full -rotate-90">
            <circle
              cx="48"
              cy="48"
              r={radius}
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="6"
            />
            <circle
              cx="48"
              cy="48"
              r={radius}
              fill="none"
              stroke={stroke}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[26px] font-bold leading-none text-slate-900">
              {score}
            </span>
            <span className="mt-1 text-[10px] font-medium text-slate-400">
              /100
            </span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold text-slate-900">
            {score >= 80
              ? "Good readiness"
              : score >= 60
              ? "Needs improvement"
              : score >= 35
              ? "Significant gaps"
              : "Not answer-ready"}
          </div>
          <p className="mt-1 text-[13.5px] leading-relaxed text-slate-600">
            This is a live analysis of the page you are reading, produced by
            the same deterministic engine that runs inside SitecoreAI Page
            Builder. Reload the page and you will get the same score.
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-2">
        {result.categories.map((cat) => {
          const pct = Math.round((cat.score / cat.maxScore) * 100);
          const color =
            pct === 100
              ? "bg-emerald-500"
              : pct >= 60
              ? "bg-amber-500"
              : "bg-red-500";
          return (
            <div
              key={cat.category}
              className="grid grid-cols-[110px_1fr_56px] items-center gap-3"
            >
              <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">
                {cat.label}
              </span>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${color}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-right text-[11px] font-medium text-slate-500">
                {cat.score}/{cat.maxScore}
              </span>
            </div>
          );
        })}
      </div>

      {actionable.length > 0 && (
        <div className="mt-6 border-t border-slate-100 pt-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            What this page is missing
          </div>
          <ul className="mt-3 space-y-3">
            {actionable.map((f) => (
              <li key={f.id} className="flex items-start gap-2.5">
                <span
                  className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                    f.severity === "error" ? "bg-red-500" : "bg-amber-500"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-slate-900">
                    {f.title}
                  </div>
                  <p className="mt-0.5 text-[12.5px] leading-relaxed text-slate-500">
                    {f.description}
                  </p>
                </div>
                <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10.5px] font-semibold text-slate-600">
                  +{f.scoreImpact}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}