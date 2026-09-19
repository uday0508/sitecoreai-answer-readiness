"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface Props {
  summary: string;
  checklist: string;
  full: string;
}

type CopyState = "idle" | "copied" | "failed";

interface MenuPosition {
  top: number;
  left: number;
  openUp: boolean;
}

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

export default function CopyButton({ summary, full, checklist }: Props) {
  const [state, setState] = useState<CopyState>("idle");
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<MenuPosition>({ top: 0, left: 0, openUp: false });

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Compute position when opening, and on resize/scroll while open
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;

    const compute = () => {
      const rect = triggerRef.current!.getBoundingClientRect();
      const menuHeight = 96;
      const menuWidth = 180;
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      const spaceBelow = viewportHeight - rect.bottom;
      const openUp = spaceBelow < menuHeight + 12;

      const top = openUp ? rect.top - menuHeight - 6 : rect.bottom + 6;
      const left = Math.min(
        Math.max(8, rect.right - menuWidth),
        viewportWidth - menuWidth - 8
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

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const doCopy = useCallback(async (text: string) => {
    let success = false;
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        success = true;
      } catch {
        success = fallbackCopy(text);
      }
    } else {
      success = fallbackCopy(text);
    }
    setState(success ? "copied" : "failed");
    setOpen(false);
    setTimeout(() => setState("idle"), 2500);
  }, []);

  return (
    <div className="flex shrink-0 items-center gap-2">
      {state === "copied" && (
        <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
          Copied
        </span>
      )}
      {state === "failed" && (
        <span className="rounded-md bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700 ring-1 ring-inset ring-red-200">
          Copy failed
        </span>
      )}

      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-medium text-slate-600 transition-colors hover:bg-slate-50"
      >
        Copy report
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-2.5 w-2.5 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
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
              width: 180,
              zIndex: 9999,
            }}
            className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => void doCopy(summary)}
              className="block w-full px-3 py-2 text-left text-[10.5px] font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Copy summary
              <span className="mt-0.5 block text-[9.5px] font-normal text-slate-400">
                Score and top fixes
              </span>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => void doCopy(full)}
              className="block w-full border-t border-slate-100 px-3 py-2 text-left text-[10.5px] font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Copy full report
              <span className="mt-0.5 block text-[9.5px] font-normal text-slate-400">
                All findings and evidence
              </span>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => void doCopy(checklist)}
              className="block w-full border-t border-slate-100 px-3 py-2 text-left text-[10.5px] font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Copy checklist
              <span className="mt-0.5 block text-[9.5px] font-normal text-slate-400">
                Markdown task list
              </span>
            </button>
          </div>,
          document.body
        )}
    </div>
  );
}