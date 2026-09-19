"use client";

import { useState } from "react";
import type { PageScoreEntry } from "./SiteAnalysisView";

export interface NormalizedPage {
  itemId: string;
  path: string;
  name: string;
  depth: number;
  children: NormalizedPage[];
}

interface Props {
  root: NormalizedPage;
  selectedPath: string | null;
  scoreByPageId: Map<string, PageScoreEntry>;
  onSelect: (page: NormalizedPage) => void;
}

export default function SitePageTree({
  root,
  selectedPath,
  scoreByPageId,
  onSelect,
}: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set([root.path]));

  const toggle = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  return (
    <TreeItem
      node={root}
      selectedPath={selectedPath}
      scoreByPageId={scoreByPageId}
      expanded={expanded}
      onToggle={toggle}
      onSelect={onSelect}
    />
  );
}

interface ItemProps {
  node: NormalizedPage;
  selectedPath: string | null;
  scoreByPageId: Map<string, PageScoreEntry>;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  onSelect: (page: NormalizedPage) => void;
}

function TreeItem({
  node,
  selectedPath,
  scoreByPageId,
  expanded,
  onToggle,
  onSelect,
}: ItemProps) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expanded.has(node.path);
  const isSelected = selectedPath === node.path;
  const cached = scoreByPageId.get(node.itemId);

  return (
    <div>
      <div
        className={`group flex items-center gap-1.5 rounded-md pr-3 transition-colors ${
          isSelected ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
        }`}
        style={{
          paddingLeft: `${10 + node.depth * 18}px`,
          paddingTop: 6,
          paddingBottom: 6,
        }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.path);
            }}
            className={`flex h-4 w-4 shrink-0 items-center justify-center transition-transform ${
              isSelected ? "text-white/80" : "text-slate-400"
            } ${isExpanded ? "rotate-90" : ""}`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        ) : (
          <span className="h-4 w-4 shrink-0" />
        )}

        <button
          type="button"
          onClick={() => onSelect(node)}
          className="flex min-w-0 flex-1 items-center gap-3 py-0.5 text-left"
        >
          <span
            className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotTone(cached)}`}
            title={cached ? scoreTitle(cached) : "Not analyzed yet"}
          />
          <span className="truncate text-[14px] font-medium">{node.name}</span>
        </button>
      </div>

      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <TreeItem
              key={child.path}
              node={child}
              selectedPath={selectedPath}
              scoreByPageId={scoreByPageId}
              expanded={expanded}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function dotTone(entry: PageScoreEntry | undefined) {
  if (!entry) return "bg-slate-300";
  if (entry.mode === "diagnostic" || entry.score === null) return "bg-slate-300";
  if (entry.score >= 80) return "bg-emerald-500";
  if (entry.score >= 60) return "bg-amber-500";
  if (entry.score >= 35) return "bg-orange-500";
  return "bg-red-500";
}

function scoreTitle(entry: PageScoreEntry) {
  if (entry.mode === "diagnostic" || entry.score === null) return "Not scoreable";
  return `Score ${entry.score}/100`;
}