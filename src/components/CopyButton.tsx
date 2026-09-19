"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface Props {
  summary: string;
  checklist: string;
  full: string;
  filename?: string;
  iconOnly?: boolean;
}

type CopyState = "idle" | "copied" | "failed";
interface MenuPosition {
  top: number;
  left: number;
  openUp: boolean;
}

const MENU_WIDTH = 200;
const MENU_HEIGHT = 192;

function fallbackCopy(text: string): boolean {
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

function downloadText(text: string, filename: string) {
  const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function CopyButton({
  summary,
  checklist,
  full,
  filename = "answer-readiness.md",
  iconOnly = false,
}: Props) {
  const [state, setState] = useState<CopyState>("idle");
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<MenuPosition>({ top: 0, left: 0, openUp: false });
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const compute = () => {
      const rect = triggerRef.current!.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < MENU_HEIGHT + 12;
      const top = openUp ? rect.top - MENU_HEIGHT - 6 : rect.bottom + 6;
      const left = Math.min(
        Math.max(8, rect.right - MENU_WIDTH),
        window.innerWidth - MENU_WIDTH - 8
      );
      setPosition({ top, left, openUp });
    };
    compute();
    window.addEventListener("resize", compute);
    window.addEventListener("scroll", compute, true);
    return () => {
      window.removeEventListener("resize", compute);
      window.removeEventListener("scroll", compute, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const click = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", click);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", click);
      document.removeEventListener("keydown", key);
    };
  }, [open]);

  const doCopy = useCallback(async (text: string) => {
    let ok = false;
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        ok = true;
      } catch {
        ok = fallbackCopy(text);
      }
    } else {
      ok = fallbackCopy(text);
    }
    setState(ok ? "copied" : "failed");
    setOpen(false);
    setTimeout(() => setState("idle"), 2500);
  }, []);

  const handleDownload = useCallback(() => {
    downloadText(full, filename);
    setOpen(false);
  }, [full, filename]);

  return (
    <div className="relative flex items-center gap-2">
      {state === "copied" && (
        <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[9.5px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
          Copied
        </span>
      )}
      {state === "failed" && (
        <span className="rounded-md bg-red-50 px-1.5 py-0.5 text-[9.5px] font-medium text-red-700 ring-1 ring-inset ring-red-200">
          Failed
        </span>
      )}

      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Export options"
        title="Export"
        className={
          iconOnly
            ? "flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
            : "flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-medium text-slate-600 transition-colors hover:bg-slate-50"
        }
      >
        {iconOnly ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
            <path d="M12 3v12" />
            <path d="m7 10 5 5 5-5" />
            <path d="M5 21h14" />
          </svg>
        ) : (
          <>
            Export
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-2.5 w-2.5 transition-transform ${open ? "rotate-180" : ""}`}>
              <path d="m6 9 6 6 6-6" />
            </svg>
          </>
        )}
      </button>

      {mounted && open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{
              position: "fixed",
              top: position.top,
              left: position.left,
              width: MENU_WIDTH,
              zIndex: 9999,
            }}
            className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
          >
            <button type="button" role="menuitem" onClick={() => void doCopy(summary)} className="block w-full px-3 py-2 text-left text-[10.5px] font-medium text-slate-700 transition-colors hover:bg-slate-50">
              Copy summary
              <span className="mt-0.5 block text-[9.5px] font-normal text-slate-400">Score and top fixes</span>
            </button>
            <button type="button" role="menuitem" onClick={() => void doCopy(checklist)} className="block w-full border-t border-slate-100 px-3 py-2 text-left text-[10.5px] font-medium text-slate-700 transition-colors hover:bg-slate-50">
              Copy checklist
              <span className="mt-0.5 block text-[9.5px] font-normal text-slate-400">Markdown task list</span>
            </button>
            <button type="button" role="menuitem" onClick={() => void doCopy(full)} className="block w-full border-t border-slate-100 px-3 py-2 text-left text-[10.5px] font-medium text-slate-700 transition-colors hover:bg-slate-50">
              Copy full report
              <span className="mt-0.5 block text-[9.5px] font-normal text-slate-400">All findings and evidence</span>
            </button>
            <button type="button" role="menuitem" onClick={handleDownload} className="block w-full border-t border-slate-100 px-3 py-2 text-left text-[10.5px] font-medium text-slate-700 transition-colors hover:bg-slate-50">
              Download .md
              <span className="mt-0.5 block text-[9.5px] font-normal text-slate-400">Save to disk</span>
            </button>
          </div>,
          document.body
        )}
    </div>
  );
}