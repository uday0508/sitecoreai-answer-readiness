import type {
  AnalysisFinding,
  AnalysisResult,
  AnalysisDiff,
  DiffEntry,
  FindingSeverity,
} from "@/src/types/analysis";

const SEVERITY_ORDER: Record<FindingSeverity, number> = {
  error: 3,
  warning: 2,
  info: 1,
  pass: 0,
};

function severityImproved(prev: FindingSeverity, curr: FindingSeverity): boolean {
  return SEVERITY_ORDER[curr] < SEVERITY_ORDER[prev];
}

function severityWorsened(prev: FindingSeverity, curr: FindingSeverity): boolean {
  return SEVERITY_ORDER[curr] > SEVERITY_ORDER[prev];
}

/**
 * Compare the previous analysis of the same page to the current analysis.
 * Only findings that are actionable (error / warning) participate in the diff.
 */
export function computeDiff(
  previous: AnalysisResult | null,
  current: AnalysisResult
): AnalysisDiff | null {
  if (!previous) return null;

  const prevActionable = new Map<string, AnalysisFinding>();
  for (const f of previous.findings) {
    if (f.severity === "error" || f.severity === "warning") {
      prevActionable.set(f.id, f);
    }
  }

  const currActionable = new Map<string, AnalysisFinding>();
  for (const f of current.findings) {
    if (f.severity === "error" || f.severity === "warning") {
      currActionable.set(f.id, f);
    }
  }

  const entries: DiffEntry[] = [];

  // Resolved: present in previous, absent in current
  for (const [id, prev] of prevActionable) {
    if (!currActionable.has(id)) {
      entries.push({
        findingId: id,
        category: prev.category,
        severity: prev.severity,
        title: prev.title,
        change: "resolved",
        previousSeverity: prev.severity,
      });
    }
  }

  // New: present in current, absent in previous
  for (const [id, curr] of currActionable) {
    if (!prevActionable.has(id)) {
      entries.push({
        findingId: id,
        category: curr.category,
        severity: curr.severity,
        title: curr.title,
        change: "new",
      });
    }
  }

  // Unchanged, improved, or worsened
  for (const [id, curr] of currActionable) {
    const prev = prevActionable.get(id);
    if (!prev) continue;
    let change: DiffEntry["change"] = "unchanged";
    if (severityImproved(prev.severity, curr.severity)) change = "improved";
    else if (severityWorsened(prev.severity, curr.severity)) change = "worsened";

    entries.push({
      findingId: id,
      category: curr.category,
      severity: curr.severity,
      title: curr.title,
      change,
      previousSeverity: prev.severity,
    });
  }

  const resolvedCount = entries.filter((e) => e.change === "resolved").length;
  const newCount = entries.filter((e) => e.change === "new").length;
  const unchangedCount = entries.filter((e) => e.change === "unchanged").length;

  return {
    previousScore: previous.score,
    currentScore: current.score,
    scoreDelta:
      previous.score !== null && current.score !== null
        ? current.score - previous.score
        : null,
    entries,
    resolvedCount,
    newCount,
    unchangedCount,
  };
}