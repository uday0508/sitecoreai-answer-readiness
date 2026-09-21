import { NextResponse } from "next/server";
import { extractHtmlSignals } from "@/src/lib/analysis/html";
import { runRules } from "@/src/lib/analysis/rules";
import { calculateResult } from "@/src/lib/analysis/score";

export const runtime = "nodejs";
export const revalidate = 300;

const ORIGIN =
  process.env.NEXT_PUBLIC_SITE_URL ??
  "https://sitecoreai-answer-readiness.vercel.app";

export async function GET() {
  try {
    const res = await fetch(ORIGIN, {
      headers: { "User-Agent": "AnswerReadinessDemo/1.0" },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Could not fetch page." },
        { status: 502 }
      );
    }

    const html = await res.text();
    const signals = extractHtmlSignals(html);
    const rules = runRules(signals);
    const result = calculateResult(rules, signals, "self", "en");

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Analysis failed." }, { status: 500 });
  }
}