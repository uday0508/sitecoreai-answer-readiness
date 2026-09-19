"use client";

interface Props {
  message: string;
  onRetry: () => void;
}

export default function SiteErrorState({ message, onRetry }: Props) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 py-16">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-red-600">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4" />
          <path d="M12 16h.01" />
        </svg>
      </div>
      <h2 className="mt-4 text-base font-semibold text-red-900">Analysis failed</h2>
      <p className="mt-1 max-w-md text-center text-[12px] leading-relaxed text-red-700">{message}</p>
      <button type="button" onClick={onRetry} className="mt-6 rounded-lg bg-white px-5 py-2.5 text-[13px] font-semibold text-red-800 ring-1 ring-inset ring-red-200 transition-colors hover:bg-red-100">
        Retry
      </button>
    </div>
  );
}