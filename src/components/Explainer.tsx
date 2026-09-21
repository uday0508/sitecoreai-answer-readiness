"use client";

import { useState } from "react";

export default function Explainer() {
  const [open, setOpen] = useState(false);

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-slate-50"
        aria-expanded={open}
      >
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
          What this measures
        </span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-3 w-3 text-slate-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="space-y-2.5 border-t border-slate-100 px-3 py-3 text-[10.5px] leading-relaxed text-slate-600">
          <p>
            AI answer engines like ChatGPT, Perplexity, Gemini, and Google AI
            Overviews pull short passages from pages, not whole documents. This
            analyzer checks whether your page gives them extractable content.
          </p>
          <p>
            <span className="font-semibold text-slate-800">
              Answer Structure
            </span>{" "}
            — whether headings, opening paragraphs, and scannable blocks let AI
            find a direct answer.
          </p>
          <p>
            <span className="font-semibold text-slate-800">
              Passage Integrity
            </span>{" "}
            — whether sections make sense when extracted out of context.
          </p>
          <p>
            <span className="font-semibold text-slate-800">
              Factual Density
            </span>{" "}
            — whether the page contains specific numbers, dates, or comparisons
            that AI prefers to quote.
          </p>
          <p>
            <span className="font-semibold text-slate-800">Entity Clarity</span>{" "}
            — whether the primary topic is clearly defined and attributed.
          </p>
          <p>
            <span className="font-semibold text-slate-800">FAQ Readiness</span>{" "}
            — whether the page has a question-answer structure that matches how
            users ask.
          </p>
          <p>
            <span className="font-semibold text-slate-800">Freshness</span> —
            whether the page exposes a machine-readable last-modified date and
            whether the content is recent.
          </p>
          <p>
            <span className="font-semibold text-slate-800">
              Citation Signals
            </span>{" "}
            — whether the page links to external sources and attributes claims
            to named sources.
          </p>
          <p className="border-t border-slate-100 pt-2 italic text-slate-500">
            The score is an internal content-readiness indicator. It is not a
            search-engine ranking score and does not guarantee citation in any
            AI surface.
          </p>
        </div>
      )}
    </section>
  );
}