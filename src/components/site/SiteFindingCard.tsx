"use client";

import type { AnalysisFinding, FindingSeverity } from "@/src/types/analysis";

interface Props {
  finding: AnalysisFinding;
  index: number;
}

function severityChip(severity: FindingSeverity) {
  switch (severity) {
    case "pass": return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "warning": return "bg-amber-50 text-amber-700 ring-amber-200";
    case "error": return "bg-red-50 text-red-700 ring-red-200";
    default: return "bg-slate-50 text-slate-600 ring-slate-200";
  }
}

function severityLabel(severity: FindingSeverity) {
  switch (severity) {
    case "pass": return "Pass";
    case "warning": return "Warning";
    case "error": return "Error";
    default: return "Info";
  }
}

export default function SiteFindingCard({ finding, index }: Props) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-7 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-start gap-4">
        <span
          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ring-1 ring-inset ${severityChip(
            finding.severity
          )}`}
        >
          {index}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-4">
            <h4 className="min-w-0 flex-1 text-[17px] font-semibold leading-snug text-slate-900">
              {finding.title}
            </h4>
            <span
              className={`shrink-0 rounded-full px-3 py-0.5 text-[12.5px] font-semibold ring-1 ring-inset ${severityChip(
                finding.severity
              )}`}
            >
              {severityLabel(finding.severity)}
            </span>
          </div>

          <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
            {finding.description}
          </p>

          <div className="mt-5 rounded-lg border-l-2 border-slate-300 bg-slate-50/70 px-5 py-4">
            <div className="text-[12px] font-semibold uppercase tracking-[0.06em] text-slate-500">
              Recommendation
            </div>
            <p className="mt-2 text-[15px] italic leading-relaxed text-slate-700">
              {finding.recommendation}
            </p>
          </div>

          {finding.suggestion && (
            <div className="mt-5 rounded-lg border border-emerald-100 bg-emerald-50/60 p-5">
              <div className="text-[12px] font-semibold uppercase tracking-[0.06em] text-emerald-700">
                Suggest rewrite
              </div>
              <div className="mt-3 space-y-2">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-[14px] font-bold text-red-500">−</span>
                  <span className="text-[15px] text-slate-500 line-through">
                    {finding.suggestion.from}
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-[14px] font-bold text-emerald-600">+</span>
                  <span className="text-[15px] font-medium text-slate-800">
                    {finding.suggestion.to}
                  </span>
                </div>
              </div>
              {finding.suggestion.rationale && (
                <p className="mt-3 text-[13.5px] italic text-emerald-700/80">
                  {finding.suggestion.rationale}
                </p>
              )}
            </div>
          )}

          {finding.samples && finding.samples.length > 0 && (
            <div className="mt-5">
              <div className="text-[12px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                Samples from the page
              </div>
              <ul className="mt-3 space-y-2">
                {finding.samples.map((sample, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 rounded-md bg-slate-50 px-3.5 py-2.5 ring-1 ring-inset ring-slate-100"
                  >
                    <span className="mt-0.5 shrink-0 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      {sample.kind}
                    </span>
                    <span className="min-w-0 flex-1 font-mono text-[13.5px] leading-relaxed text-slate-600">
                      {sample.value}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {finding.evidence?.value && !finding.samples?.length && (
            <div className="mt-5">
              <span className="inline-block max-w-full truncate rounded-md bg-slate-50 px-3 py-2 font-mono text-[13.5px] text-slate-500 ring-1 ring-inset ring-slate-100">
                {finding.evidence.source}: {finding.evidence.value.slice(0, 120)}
              </span>
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 pt-4 text-[13.5px] text-slate-500">
            <span>
              <span className="font-semibold text-slate-700">+{finding.scoreImpact}</span>{" "}
              point impact
            </span>
            {finding.level && finding.level !== "unknown" && (
              <>
                <span className="h-3.5 w-px bg-slate-200" />
                <span className="uppercase tracking-wide">
                  {finding.level}-level fix
                </span>
              </>
            )}
            {finding.automated && (
              <>
                <span className="h-3.5 w-px bg-slate-200" />
                <span>Detected automatically</span>
              </>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}