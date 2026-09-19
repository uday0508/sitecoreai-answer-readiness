"use client";

import type { AnalysisFinding, AnalysisResult } from "@/src/types/analysis";

interface Props {
  result: AnalysisResult;
  onOpenCategory: (category: string) => void;
  dismissedIds: Set<string>;
}

const SEVERITY_RANK: Record<AnalysisFinding["severity"], number> = {
  error: 0,
  warning: 1,
  info: 2,
  pass: 3,
};

function groupFindings(findings: AnalysisFinding[]) {
  const critical = findings.filter((f) => f.severity === "error");
  const important = findings.filter((f) => f.severity === "warning");
  const optional = findings.filter((f) => f.severity === "info");
  return { critical, important, optional };
}

function sortByImpact(findings: AnalysisFinding[]) {
  return [...findings].sort((a, b) => b.scoreImpact - a.scoreImpact);
}

interface PriorityItemProps {
  finding: AnalysisFinding;
  index: number;
  onOpenCategory: (category: string) => void;
}

function PriorityItem({ finding, index, onOpenCategory }: PriorityItemProps) {
  return (
    <button
      type="button"
      onClick={() => onOpenCategory(finding.category)}
      className="flex w-full items-start gap-2.5 rounded-lg border border-slate-200 bg-white p-2.5 text-left transition-colors hover:border-slate-300 hover:bg-slate-50"
    >
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
          finding.severity === "error"
            ? "bg-red-100 text-red-700"
            : "bg-amber-100 text-amber-700"
        }`}
      >
        {index}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 text-[11.5px] font-semibold leading-snug text-slate-900">
            {finding.title}
          </div>
          <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-600">
            +{finding.scoreImpact}
          </span>
        </div>
        <div className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-slate-500">
          {finding.recommendation}
        </div>
      </div>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mt-1 h-3 w-3 shrink-0 text-slate-300"
      >
        <path d="m9 18 6-6-6-6" />
      </svg>
    </button>
  );
}

interface SectionProps {
  title: string;
  findings: AnalysisFinding[];
  startIndex: number;
  onOpenCategory: (category: string) => void;
}

function Section({ title, findings, startIndex, onOpenCategory }: SectionProps) {
  if (findings.length === 0) return null;
  return (
    <div>
      <div className="mb-1.5 px-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em] text-slate-400">
        {title} · {findings.length}
      </div>
      <div className="space-y-1.5">
        {findings.map((finding, i) => (
          <PriorityItem
            key={finding.id}
            finding={finding}
            index={startIndex + i}
            onOpenCategory={onOpenCategory}
          />
        ))}
      </div>
    </div>
  );
}

export default function PriorityList({ result, onOpenCategory, dismissedIds }: Props) {
  const visible = result.findings.filter(
    (f) => !dismissedIds.has(f.id) && f.severity !== "pass"
  );

  const { critical, important, optional } = groupFindings(visible);

  const sortedCritical = sortByImpact(critical);
  const sortedImportant = sortByImpact(important);
  const sortedOptional = sortByImpact(optional);

  if (visible.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center">
        <div className="text-[12px] font-semibold text-emerald-800">No actionable issues</div>
        <p className="mt-0.5 text-[10.5px] text-emerald-700">
          All checks passed or dismissed for this session.
        </p>
      </div>
    );
  }

  let index = 1;

  return (
    <div className="space-y-4">
      <Section
        title="Critical"
        findings={sortedCritical}
        startIndex={index}
        onOpenCategory={onOpenCategory}
      />
      {(() => {
        index += sortedCritical.length;
        return null;
      })()}

      <Section
        title="Important"
        findings={sortedImportant}
        startIndex={index}
        onOpenCategory={onOpenCategory}
      />
      {(() => {
        index += sortedImportant.length;
        return null;
      })()}

      <Section
        title="Optional"
        findings={sortedOptional}
        startIndex={index}
        onOpenCategory={onOpenCategory}
      />
    </div>
  );
}