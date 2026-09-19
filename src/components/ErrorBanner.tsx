"use client";

interface Props {
  message: string;
  onRetry: () => void;
}

export default function ErrorBanner({ message, onRetry }: Props) {
  return (
    <div className="flex items-start justify-between gap-2 rounded-xl border border-red-200 bg-red-50 p-2.5">
      <div className="min-w-0 flex-1">
        <div className="text-[10.5px] font-semibold text-red-900">
          Analysis failed
        </div>
        <p className="mt-0.5 text-[10px] leading-relaxed text-red-800">
          {message}
        </p>
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