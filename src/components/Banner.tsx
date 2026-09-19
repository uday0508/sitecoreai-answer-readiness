"use client";

import { useEffect, useState } from "react";

type BannerVariant = "stale" | "error";

interface Props {
  variant: BannerVariant;
  message?: string;
  analyzedAt?: string;
  edited?: boolean;
  onRetry?: () => void;
}

const STALE_MS = 5 * 60 * 1000;

function StaleBanner({
  analyzedAt,
  edited,
  onRetry,
}: Pick<Props, "analyzedAt" | "edited" | "onRetry">) {
  const [isStale, setIsStale] = useState(false);

  useEffect(() => {
    if (!analyzedAt) return;
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
        {edited ? "Content has been edited." : "Content may have changed."}
      </span>
      <button
        type="button"
        onClick={onRetry}
        className="shrink-0 rounded-md bg-white px-2 py-0.5 text-[10px] font-medium text-blue-800 ring-1 ring-inset ring-blue-200 transition-colors hover:bg-blue-100"
      >
        Re-run
      </button>
    </div>
  );
}

function ErrorBannerView({
  message,
  onRetry,
}: Pick<Props, "message" | "onRetry">) {
  return (
    <div className="flex items-start justify-between gap-2 rounded-xl border border-red-200 bg-red-50 p-2.5">
      <div className="min-w-0 flex-1">
        <div className="text-[10.5px] font-semibold text-red-900">Analysis failed</div>
        <p className="mt-0.5 text-[10px] leading-relaxed text-red-800">{message}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="shrink-0 rounded-md bg-white px-2 py-0.5 text-[10px] font-medium text-red-800 ring-1 ring-inset ring-red-200 transition-colors hover:bg-red-100"
      >
        Retry
      </button>
    </div>
  );
}

export default function Banner(props: Props) {
  if (props.variant === "error") {
    return <ErrorBannerView message={props.message} onRetry={props.onRetry} />;
  }
  return (
    <StaleBanner
      analyzedAt={props.analyzedAt}
      edited={props.edited}
      onRetry={props.onRetry}
    />
  );
}