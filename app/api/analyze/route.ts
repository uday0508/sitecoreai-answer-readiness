import { NextResponse } from "next/server";
import { extractHtmlSignals } from "@/src/lib/analysis/html";
import { runRules } from "@/src/lib/analysis/rules";
import { calculateResult } from "@/src/lib/analysis/score";

export const runtime = "nodejs";

const MAX_HTML_BYTES = 2_000_000;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      html?: unknown;
      pageId?: unknown;
      language?: unknown;
    };

    if (typeof body.html !== "string" || body.html.length === 0) {
      return NextResponse.json({ error: "html is required" }, { status: 400 });
    }

    if (new TextEncoder().encode(body.html).byteLength > MAX_HTML_BYTES) {
      return NextResponse.json(
        { error: "Rendered HTML is too large to analyze." },
        { status: 413 }
      );
    }

    const signals = extractHtmlSignals(body.html);
    const findings = runRules(signals);
    const result = calculateResult(
      findings,
      signals,
      typeof body.pageId === "string" ? body.pageId : undefined,
      typeof body.language === "string" ? body.language : undefined
    );

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Analysis failed." },
      { status: 500 }
    );
  }
}