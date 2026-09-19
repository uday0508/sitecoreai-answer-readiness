export interface HtmlSignals {
  text: string;
  headings: { level: number; text: string; isQuestion: boolean }[];
  firstParagraph: string;
  paragraphs: string[];

  title: string | null;
  metaDescription: string | null;
  canonical: string | null;
  openGraph: Record<string, string>;
  jsonLd: unknown[];

  hasFaqSchema: boolean;
  questionHeadings: number;
  factualMarkers: number;
  pronounHeavySections: number;
  selfContainedIssues: number;
  lists: number;
  tables: number;
  hasLocalhostUrls: boolean;
  genericAltTexts: number;
}

const QUESTION_START =
  /^(what|how|why|when|where|who|which|can|does|do|is|are|should|will|may)\b/i;

const PRONOUNS = /\b(it|this|that|they|them|these|those|he|she|his|her|its)\b/gi;

const FACTUAL_MARKERS =
  /\b\d+(\.\d+)?(%|\s?(percent|million|billion|thousand|days?|weeks?|months?|years?|hours?|minutes?|users?|customers?|companies|countries|regions?))?\b|\b(19|20)\d{2}\b|\b(compared to|versus|vs\.?|more than|less than|fewer than|faster than|slower than)\b/gi;

const SELF_CONTAINMENT_ISSUES =
  /\b(as mentioned (above|below|earlier|previously)|see above|see below|as noted (above|earlier)|the (above|previous|following) (section|paragraph|example)|the aforementioned)\b/gi;

const GENERIC_ALT_PATTERN =
  /alt=["'](card\s*\d+|image\s*\d+|img\s*\d+|photo\s*\d+|picture\s*\d+|placeholder)["']/gi;

function decode(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripTags(html: string) {
  return decode(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function detectFaqSchema(jsonLd: unknown[]): boolean {
  for (const block of jsonLd) {
    if (!block || typeof block !== "object") continue;
    const stack: unknown[] = [block];
    while (stack.length) {
      const node = stack.pop();
      if (!node || typeof node !== "object") continue;
      const obj = node as Record<string, unknown>;
      const type = obj["@type"];
      if (typeof type === "string" && /faqpage/i.test(type)) return true;
      if (
        Array.isArray(type) &&
        type.some((t) => typeof t === "string" && /faqpage/i.test(t))
      ) {
        return true;
      }
      for (const v of Object.values(obj)) {
        if (v && typeof v === "object") stack.push(v);
      }
    }
  }
  return false;
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}|(?<=\.\s)(?=[A-Z])/)
    .map((p) => p.trim())
    .filter((p) => p.length > 40);
}

function countMatches(text: string, re: RegExp) {
  return (text.match(re) ?? []).length;
}

export function extractHtmlSignals(html: string): HtmlSignals {
  const headings = [...html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)]
    .map((m) => {
      const text = stripTags(m[2]);
      return {
        level: Number(m[1]),
        text,
        isQuestion: text.endsWith("?") || QUESTION_START.test(text),
      };
    })
    .filter((x) => x.text.length > 0);

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const descriptionMatch = html.match(
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i
  );
  const canonicalMatch = html.match(
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["'][^>]*>/i
  );

  const openGraph: Record<string, string> = {};
  for (const match of html.matchAll(
    /<meta[^>]+property=["'](og:[^"']+)["'][^>]+content=["']([^"']*)["'][^>]*>/gi
  )) {
    openGraph[match[1]] = decode(match[2]);
  }

  const jsonLd: unknown[] = [];
  for (const match of html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  )) {
    try {
      jsonLd.push(JSON.parse(match[1].trim()));
    } catch {
      jsonLd.push({ invalidJsonLd: true });
    }
  }

  const text = decode(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );

  const paragraphs = splitParagraphs(text);
  const firstParagraph = paragraphs[0] ?? "";

  let pronounHeavySections = 0;
  for (const p of paragraphs) {
    const words = p.split(/\s+/).length;
    if (words < 20) continue;
    const pronounCount = countMatches(p, PRONOUNS);
    if (pronounCount / words > 0.08) pronounHeavySections++;
  }

  const hasLocalhostUrls =
    /localhost(:\d+)?/i.test(html) &&
    /(canonical|og:url|"url"|"@id")/i.test(html);

  return {
    text,
    headings,
    firstParagraph,
    paragraphs,
    title: titleMatch ? decode(titleMatch[1].trim()) : null,
    metaDescription: descriptionMatch ? decode(descriptionMatch[1].trim()) : null,
    canonical: canonicalMatch ? decode(canonicalMatch[1].trim()) : null,
    openGraph,
    jsonLd,
    hasFaqSchema: detectFaqSchema(jsonLd),
    questionHeadings: headings.filter((h) => h.isQuestion).length,
    factualMarkers: countMatches(text, FACTUAL_MARKERS),
    pronounHeavySections,
    selfContainedIssues: countMatches(text, SELF_CONTAINMENT_ISSUES),
    lists: (html.match(/<ul\b|<ol\b/gi) ?? []).length,
    tables: (html.match(/<table\b/gi) ?? []).length,
    hasLocalhostUrls,
    genericAltTexts: countMatches(html, GENERIC_ALT_PATTERN),
  };
}