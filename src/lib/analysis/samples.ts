import type { HtmlSignals } from "./html";
import type { FindingSample } from "@/src/types/analysis";

const MAX_SAMPLES = 3;
const MAX_SAMPLE_LEN = 80;

function truncate(value: string, max = MAX_SAMPLE_LEN): string {
  if (value.length <= max) return value;
  return value.slice(0, max - 1).trimEnd() + "…";
}

export function headingSamples(signals: HtmlSignals, onlyNonQuestion = false): FindingSample[] {
  const list = onlyNonQuestion
    ? signals.headings.filter((h) => !h.isQuestion)
    : signals.headings;

  return list.slice(0, MAX_SAMPLES).map((h, i) => ({
    kind: "heading" as const,
    value: truncate(`H${h.level}: ${h.text}`),
    position: i + 1,
  }));
}

export function paragraphSamples(signals: HtmlSignals, limit = MAX_SAMPLES): FindingSample[] {
  return signals.paragraphs.slice(0, limit).map((p, i) => ({
    kind: "paragraph" as const,
    value: truncate(p),
    position: i + 1,
  }));
}

export function jsonLdSamples(signals: HtmlSignals): FindingSample[] {
  const samples: FindingSample[] = [];
  for (const block of signals.jsonLd) {
    if (samples.length >= MAX_SAMPLES) break;
    if (!block || typeof block !== "object") continue;
    const obj = block as Record<string, unknown>;
    const type = obj["@type"];
    if (typeof type === "string") {
      samples.push({ kind: "schema", value: truncate(`@type: ${type}`) });
    }
  }
  return samples;
}

export function titleSample(signals: HtmlSignals): FindingSample | null {
  if (!signals.title) return null;
  return { kind: "title", value: truncate(signals.title) };
}

export function metaSample(signals: HtmlSignals): FindingSample | null {
  if (!signals.metaDescription) return null;
  return { kind: "meta", value: truncate(signals.metaDescription) };
}

export function contextSample(signals: HtmlSignals): FindingSample | null {
  const text = signals.text;
  if (!text) return null;
  return { kind: "paragraph", value: truncate(text) };
}