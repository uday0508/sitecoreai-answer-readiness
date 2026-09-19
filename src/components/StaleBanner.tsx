"use client";

import { useEffect, useState } from "react";

interface Props {
  analyzedAt: string;
  onReanalyze: () => void;
  edited?: boolean;
}

const STALE_MS = 5 * 60 * 1000;

export default function StaleBanner({ analyzedAt, onReanalyze, edited }: Props) {
  const [isStale, setIsStale] = useState(false);

  useEffect(() => {
    const check = () => {
      const age = Date.now() - new Date(analyzedAt).getTime();
      setIsStale(age > STALE_MS);
    };
    check();
    const interval = setInterval(check, 30_000);
    return () => clearInterval(interval);
  }, [analyzedAt]);

  if (!isStale && !edited) return null;

  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2">
      <span className="text-[10.5px] leading-relaxed text-blue-900">
        {edited
          ? "Content has been edited since the last analysis."
          : "Content may have changed since the last analysis."}
      </span>
      <button
        className="shrink-0 rounded-md bg-white px-2 py-0.5 text-[10px] font-medium text-blue-800 ring-1 ring-inset ring-blue-200 transition-colors hover:bg-blue-100"
        onClick={onReanalyze}
      >
        Re-run
      </button>
    </div>
  );
}