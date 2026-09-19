"use client";

export default function SiteWelcomePanel() {
  return (
    <div className="flex h-full flex-col items-center justify-center py-24">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5 text-slate-400"
        >
          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
          <path d="M14 2v4a2 2 0 0 0 2 2h4" />
          <path d="M9 13h6" />
          <path d="M9 17h4" />
        </svg>
      </div>
      <h2 className="mt-4 text-[14px] font-semibold text-slate-900">
        Select a page to analyze
      </h2>
      <p className="mt-1 max-w-sm text-center text-[12px] leading-relaxed text-slate-500">
        Choose a page from the tree on the left. The answer readiness report
        will appear here.
      </p>
    </div>
  );
}