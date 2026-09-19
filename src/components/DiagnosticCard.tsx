"use client";

import type { AnalysisResult } from "@/src/types/analysis";

interface Props {
  result: AnalysisResult;
  onReanalyze: () => void;
  loading: boolean;
}

export default function DiagnosticCard({ result, onReanalyze, loading }: Props) {
  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-[11px] font-bold text-white">
          !
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[12.5px] font-semibold text-amber-900">
            Not enough content to score
          </div>
          <p className="mt-1 text-[10.5px] leading-relaxed text-amber-800">
            This page does not contain enough structured content to produce a
            meaningful readiness score. The analyzer found the following gaps.
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-amber-200 bg-white p-2.5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-amber-700">
          Missing signals ({result.diagnostics.length})
        </div>
        <ul className="mt-1.5 space-y-1">
          {result.diagnostics.map((d, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-500" />
              <span className="text-[10.5px] leading-relaxed text-slate-700">
                {d}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-white p-2 ring-1 ring-inset ring-amber-100">
          <div className="text-[14px] font-bold text-slate-900">
            {result.source.wordCount}
          </div>
          <div className="text-[9px] font-medium uppercase tracking-wider text-slate-500">
            Words
          </div>
        </div>
        <div className="rounded-lg bg-white p-2 ring-1 ring-inset ring-amber-100">
          <div className="text-[14px] font-bold text-slate-900">
            {result.source.headingCount}
          </div>
          <div className="text-[9px] font-medium uppercase tracking-wider text-slate-500">
            Headings
          </div>
        </div>
        <div className="rounded-lg bg-white p-2 ring-1 ring-inset ring-amber-100">
          <div className="text-[14px] font-bold text-slate-900">
            {result.source.paragraphCount}
          </div>
          <div className="text-[9px] font-medium uppercase tracking-wider text-slate-500">
            Paragraphs
          </div>
        </div>
      </div>

      <p className="mt-3 text-[10px] leading-relaxed text-amber-800">
        Add page-level content — an H1, an opening paragraph, prose sections,
        and at least one FAQ or Q&A section — then re-run the analysis.
      </p>

      <button
        className="mt-3 w-full rounded-lg bg-slate-900 px-3 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        onClick={onReanalyze}
        disabled={loading}
      >
        {loading ? "Analyzing…" : "Re-analyze"}
      </button>
    </section>
  );
}