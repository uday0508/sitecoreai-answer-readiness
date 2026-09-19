"use client";

import type { SiteAnalysisProgress } from "@/src/types/site-analysis";

interface Props {
  message: string;
  progress?: SiteAnalysisProgress;
}

export default function SiteLoadingState({ message, progress }: Props) {
  const pct =
    progress && progress.total > 0
      ? Math.round((progress.processed / progress.total) * 100)
      : null;

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-16">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
      <div className="mt-4 text-[13px] font-medium text-slate-700">{message}</div>
      {pct !== null && (
        <>
          <div className="mt-4 h-1.5 w-64 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-slate-900 transition-all duration-300" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            {progress?.processed} of {progress?.total} pages · {pct}%
          </div>
        </>
      )}
    </div>
  );
}