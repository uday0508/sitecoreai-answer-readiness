"use client";

export default function EmptyState() {
  return (
    <section className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-center">
      <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4 text-slate-500"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </div>
      <div className="mt-2 text-[12px] font-semibold text-slate-900">
        Waiting for Page Builder
      </div>
      <p className="mt-0.5 text-[10.5px] leading-relaxed text-slate-500">
        Open a page in Page Builder to analyze its answer readiness.
      </p>
    </section>
  );
}