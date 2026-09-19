"use client";

import { useEffect } from "react";
import type { AnalysisResult, AnalysisCategory } from "@/src/types/analysis";

interface Props {
  open: boolean;
  onClose: () => void;
  result?: AnalysisResult | null;
}

const CATEGORY_WEIGHTS: Array<{ key: AnalysisCategory; label: string; weight: number }> = [
  { key: "answer-structure", label: "Answer Structure", weight: 35 },
  { key: "passage-integrity", label: "Passage Integrity", weight: 25 },
  { key: "factual-density", label: "Factual Density", weight: 20 },
  { key: "entity-clarity", label: "Entity Clarity", weight: 10 },
  { key: "faq-readiness", label: "FAQ Readiness", weight: 10 },
];

export default function HelpModal({ open, onClose, result }: Props) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const body = document.body;
    const prev = body.style.overflow;
    body.style.overflow = "hidden";
    return () => {
      body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="How this score is calculated"
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
          maxWidth: 480,
          maxHeight: "calc(100vh - 32px)",
          overflowY: "auto",
          background: "#ffffff",
          borderRadius: 12,
          padding: 20,
          boxShadow: "0 20px 40px rgba(15, 23, 42, 0.25)",
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-[15px] font-semibold text-slate-900">
            How this score is calculated
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <p className="mt-3 text-[12px] leading-relaxed text-slate-600">
          The score is produced by a deterministic rule engine. Every deducted
          point traces back to a specific finding and the evidence behind it.
          No LLM is used to produce the number, and the same page always
          produces the same score.
        </p>

        {/* Weights and deductions */}
        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left text-[10.5px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                  Category
                </th>
                <th className="px-3 py-2 text-right text-[10.5px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                  Weight
                </th>
                {result && (
                  <>
                    <th className="px-3 py-2 text-right text-[10.5px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                      Score
                    </th>
                    <th className="px-3 py-2 text-right text-[10.5px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                      Deducted
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {CATEGORY_WEIGHTS.map((row) => {
                const cat = result?.categories.find((c) => c.category === row.key);
                const deducted = cat ? row.weight - cat.score : null;
                return (
                  <tr key={row.key}>
                    <td className="px-3 py-2 text-[12px] text-slate-700">
                      {row.label}
                    </td>
                    <td className="px-3 py-2 text-right text-[12px] font-medium text-slate-700">
                      {row.weight}
                    </td>
                    {result && cat && (
                      <>
                        <td className="px-3 py-2 text-right text-[12px] font-semibold text-slate-900">
                          {cat.score}
                        </td>
                        <td
                          className={`px-3 py-2 text-right text-[12px] font-medium ${
                            deducted && deducted > 0
                              ? "text-red-600"
                              : "text-emerald-600"
                          }`}
                        >
                          {deducted === 0 ? "—" : `−${deducted}`}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
              <tr className="bg-slate-50/70">
                <td className="px-3 py-2 text-[12px] font-semibold text-slate-900">
                  Total
                </td>
                <td className="px-3 py-2 text-right text-[12px] font-semibold text-slate-900">
                  100
                </td>
                {result && (
                  <>
                    <td className="px-3 py-2 text-right text-[12px] font-bold text-slate-900">
                      {result.score ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right text-[12px] font-medium text-slate-600">
                      {result.score !== null ? `−${100 - result.score}` : "—"}
                    </td>
                  </>
                )}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Rules triggered */}
        {result && (
          <div className="mt-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
              Rules triggered · {result.findings.filter((f) => f.severity !== "pass").length}
            </div>
            <ul className="mt-2 space-y-1">
              {result.findings
                .filter((f) => f.severity !== "pass")
                .sort((a, b) => b.scoreImpact - a.scoreImpact)
                .slice(0, 8)
                .map((f) => (
                  <li
                    key={f.id}
                    className="flex items-start gap-2 text-[11.5px] leading-relaxed text-slate-600"
                  >
                    <span
                      className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                        f.severity === "error"
                          ? "bg-red-500"
                          : f.severity === "warning"
                          ? "bg-amber-500"
                          : "bg-slate-300"
                      }`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="font-medium text-slate-800">{f.title}</span>
                      <span className="ml-1 text-slate-400">−{f.scoreImpact}</span>
                    </span>
                  </li>
                ))}
              {result.findings.filter((f) => f.severity !== "pass").length > 8 && (
                <li className="pl-3.5 text-[11px] italic text-slate-400">
                  …and{" "}
                  {result.findings.filter((f) => f.severity !== "pass").length - 8}{" "}
                  more
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Category definitions */}
        <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
            What the categories measure
          </div>
          <p className="text-[11.5px] leading-relaxed text-slate-600">
            <span className="font-semibold text-slate-800">Answer Structure</span> — headings,
            opening paragraphs, and scannable blocks that let AI find a direct answer.
          </p>
          <p className="text-[11.5px] leading-relaxed text-slate-600">
            <span className="font-semibold text-slate-800">Passage Integrity</span> — whether
            each section makes sense when extracted out of context.
          </p>
          <p className="text-[11.5px] leading-relaxed text-slate-600">
            <span className="font-semibold text-slate-800">Factual Density</span> — specific
            numbers, dates, and comparisons that AI prefers to quote.
          </p>
          <p className="text-[11.5px] leading-relaxed text-slate-600">
            <span className="font-semibold text-slate-800">Entity Clarity</span> — whether the
            primary topic is clearly defined and attributed.
          </p>
          <p className="text-[11.5px] leading-relaxed text-slate-600">
            <span className="font-semibold text-slate-800">FAQ Readiness</span> — whether the
            page has a question-answer structure that matches how users ask.
          </p>
        </div>

        {/* Honesty note */}
        <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="text-[11px] font-semibold text-slate-700">
            What this score is not
          </div>
          <ul className="mt-1.5 space-y-1 text-[11px] leading-relaxed text-slate-600">
            <li>· Not a search engine ranking score.</li>
            <li>· Not a prediction of citation in any AI surface.</li>
            <li>
              · Based on the published HTML of the page. Unsaved edits are not
              reflected until the page is published.
            </li>
            <li>
              · Does not verify factual accuracy against external sources.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}