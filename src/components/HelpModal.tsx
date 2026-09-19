"use client";

import { useEffect, useRef } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function HelpModal({ open, onClose }: Props) {
  const scrollLockRef = useRef<number>(0);

  useEffect(() => {
    if (!open) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);

    // Lock body scroll while open so the modal does not move with the panel.
    const body = document.body;
    scrollLockRef.current = window.scrollY;
    const prevOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handler);
      body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="What this measures"
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 2147483647,
        background: "rgba(15, 23, 42, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 440,
          maxHeight: "calc(100vh - 32px)",
          overflowY: "auto",
          background: "#ffffff",
          borderRadius: 12,
          padding: 16,
          boxShadow: "0 20px 40px rgba(15, 23, 42, 0.25)",
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-[14px] font-semibold text-slate-900">What this measures</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <div className="mt-3 space-y-3 text-[11px] leading-relaxed text-slate-600">
          <p>
            AI answer engines like ChatGPT, Perplexity, Gemini, and Google AI
            Overviews pull short passages from pages, not whole documents. This
            analyzer checks whether your page gives them extractable content.
          </p>
          <div>
            <div className="font-semibold text-slate-800">Answer Structure</div>
            <p>
              Whether headings, opening paragraphs, and scannable blocks let AI
              find a direct answer.
            </p>
          </div>
          <div>
            <div className="font-semibold text-slate-800">Passage Integrity</div>
            <p>Whether sections make sense when extracted out of context.</p>
          </div>
          <div>
            <div className="font-semibold text-slate-800">Factual Density</div>
            <p>
              Whether the page contains specific numbers, dates, or comparisons
              that AI prefers to quote.
            </p>
          </div>
          <div>
            <div className="font-semibold text-slate-800">Entity Clarity</div>
            <p>Whether the primary topic is clearly defined and attributed.</p>
          </div>
          <div>
            <div className="font-semibold text-slate-800">FAQ Readiness</div>
            <p>
              Whether the page has a question-answer structure that matches how
              users ask.
            </p>
          </div>
          <p className="border-t border-slate-100 pt-3 italic text-slate-500">
            The score is an internal content-readiness indicator. It is not a
            search-engine ranking score and does not guarantee citation in any AI
            surface.
          </p>
        </div>
      </div>
    </div>
  );
}