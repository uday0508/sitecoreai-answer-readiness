"use client";

import type { AnalysisResult, AnalysisFinding } from "@/src/types/analysis";

interface Props {
  result: AnalysisResult;
  onOpenCategory: (category: string) => void;
}

const SEVERITY_RANK: Record<AnalysisFinding["severity"], number> = {
  error: 0,
  warning: 1,
  info: 2,
  pass: 3,
};

function pickHero(result: AnalysisResult): AnalysisFinding | null {
  const candidates = result.findings.filter(
    (f) => f.severity === "error" || f.severity === "warning"
  );
  if (candidates.length === 0) return null;
  return [...candidates].sort((a, b) => {
    const s = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (s !== 0) return s;
    return b.scoreImpact - a.scoreImpact;
  })[0];
}

export default function HeroFix({ result, onOpenCategory }: Props) {
  const hero = pickHero(result);
  if (!hero) return null;

  return (
    <section className="rounded-xl border border-red-200 bg-red-50/70 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-red-700">
        Start here
      </div>
      <button
        type="button"
        onClick={() => onOpenCategory(hero.category)}
        className="mt-1.5 block w-full text-left transition-opacity hover:opacity-80"
      >
        <div className="text-[12.5px] font-semibold leading-snug text-slate-900">
          {hero.title}
        </div>
        <div className="mt-0.5 text-[10.5px] leading-relaxed text-slate-600">
          {hero.recommendation}
        </div>
        <div className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-[10px] font-semibold text-red-700 ring-1 ring-inset ring-red-200">
          Estimated impact: +{hero.scoreImpact} points
        </div>
      </button>
    </section>
  );
}