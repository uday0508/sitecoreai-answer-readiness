"use client";

import { useCallback, useState } from "react";

interface Props {
  text: string;
}

type CopyState = "idle" | "copied" | "failed";

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

export default function CopyButton({ text }: Props) {
  const [state, setState] = useState<CopyState>("idle");

  const handleCopy = useCallback(async () => {
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
    setTimeout(() => setState("idle"), 2500);
  }, [text]);

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
        type="button"
        onClick={handleCopy}
        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-medium text-slate-600 transition-colors hover:bg-slate-50"
      >
        Copy report
      </button>
    </div>
  );
}