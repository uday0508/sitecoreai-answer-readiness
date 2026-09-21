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
  /** Question strings extracted from FAQPage JSON-LD mainEntity[].name */
  faqSchemaQuestions: string[];
  /** FAQPage questions whose text was verified to appear in the visible page text */
  faqMatchedQuestions: string[];
  /**
   * Question-shaped strings found in the rendered HTML outside of JSON-LD.
   * Sources: <h1>–<h6> ending in "?", <summary> ending in "?",
   * <button> ending in "?", and any element whose class contains
   * faq/question/accordion/qa- whose text ends in "?".
   */
  visibleFaqQuestions: string[];

  questionHeadings: number;
  factualMarkers: number;
  pronounHeavySections: number;
  selfContainedIssues: number;
  lists: number;
  tables: number;
  hasLocalhostUrls: boolean;
  genericAltTexts: number;

  hasAuthorMeta: boolean;
  hasAuthorSchema: boolean;
  hasVisibleByline: boolean;
  authorName: string | null;

  wordCount: number;

  pageUrl: string | null;
  pageHost: string | null;

  dateModified: string | null;
  dateModifiedIso: string | null;
  dateModifiedSource:
  | "meta-article"
  | "meta-og"
  | "meta-name"
  | "json-ld"
  | "time-element"
  | null;
  datePublished: string | null;

  externalLinks: { href: string; text: string; domain: string }[];
  externalLinkDomains: string[];
  namedAttributionCount: number;
  attributedSources: string[];
  hasCiteAttribute: boolean;
}

const QUESTION_START =
  /^(what|how|why|when|where|who|which|can|does|do|is|are|should|will|may)\b/i;

const PRONOUNS = /\b(it|they|them|these|those|he|she|him|her|his|hers|its)\b/gi;

const FACTUAL_MARKERS =
  /\b\d+(?:\.\d+)?\s?(?:%|percent|million|billion|thousand|days?|weeks?|months?|years?|hours?|minutes?|users?|customers?|companies|countries|regions?)\b|\b(?:in|since|during|before|after|by)\s(?:19|20)\d{2}\b|\b(?:compared to|versus|vs\.?|more than|less than|fewer than|faster than|slower than)\b/gi;

const SELF_CONTAINMENT_ISSUES =
  /\b(as mentioned (above|below|earlier|previously)|see above|see below|as noted (above|earlier)|the (above|previous|following) (section|paragraph|example)|the aforementioned)\b/gi;

const GENERIC_ALT_PATTERN =
  /alt=["'](card\s*\d+|image\s*\d+|img\s*\d+|photo\s*\d+|picture\s*\d+|placeholder)["']/gi;

const BYLINE_BLOCK_PATTERN =
  /<(p|span|address|div)\b[^>]*(?:class=["'][^"']*\b(?:byline|author|meta|dateline)\b[^"']*["'])?[^>]*>([\s\S]{0,200}?)<\/\1>/gi;
const BYLINE_INNER_PATTERN =
  /\b(?:by|written by|posted by|reviewed by|author[:\s])\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/;

const ATTRIBUTION_PATTERN =
  /\b(?:according to|as reported by|as noted by|reported by|cited by|stated by|research (?:from|by)|study (?:from|by)|data (?:from|by))\s+([A-Z][\w&.\-]*(?:\s+[A-Z][\w&.\-]*)+)/g;

const ARTICLE_TYPES =
  /^(Article|BlogPosting|NewsArticle|WebPage|TechArticle|Report)$/i;

// Class tokens that commonly wrap FAQ items in the wild.
const FAQ_CLASS_PATTERN = /class=["'][^"']*\b(?:faq|question|accordion|qa-)[^"']*["']/i;

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

// ─── FAQPage (JSON-LD) ────────────────────────────────────
function collectFaqQuestions(jsonLd: unknown[]): string[] {
  const questions: string[] = [];
  for (const block of jsonLd) {
    if (!block || typeof block !== "object") continue;
    const stack: unknown[] = [block];
    while (stack.length) {
      const node = stack.pop();
      if (!node || typeof node !== "object") continue;
      const obj = node as Record<string, unknown>;
      const type = obj["@type"];
      const isFaq =
        (typeof type === "string" && type.toLowerCase() === "faqpage") ||
        (Array.isArray(type) &&
          type.some(
            (t) => typeof t === "string" && t.toLowerCase() === "faqpage"
          ));
      if (isFaq) {
        const main = obj.mainEntity;
        const items = Array.isArray(main) ? main : main ? [main] : [];
        for (const item of items) {
          if (!item || typeof item !== "object") continue;
          const q = (item as Record<string, unknown>).name;
          if (typeof q === "string" && q.trim().length > 0) {
            questions.push(q.trim());
          }
        }
      }
      for (const v of Object.values(obj)) {
        if (v && typeof v === "object") stack.push(v);
      }
    }
  }
  return questions;
}

function detectFaqSchema(jsonLd: unknown[]): boolean {
  return collectFaqQuestions(jsonLd).length > 0;
}

// ─── Visible FAQ questions (HTML) ─────────────────────────
function normalizeQuestion(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

function collectVisibleFaqQuestions(html: string): string[] {
  const found = new Set<string>();

  const consider = (raw: string) => {
    const q = raw.replace(/\s+/g, " ").trim();
    if (q.length < 6) return;
    if (q.length > 300) return;
    if (!q.endsWith("?")) return;
    found.add(q);
  };

  // Scan the raw HTML for every "?". Walk backward from each "?" to the
  // nearest tag boundary. Whatever text is between that boundary and the
  // "?" is a candidate question. No dependency on tags, classes, or
  // markup structure — it works with <span>, <div>, <summary>, <button>,
  // or raw text.
  const re = /\?/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const qEnd = match.index;
    let start = qEnd;
    while (start > 0) {
      const ch = html[start - 1];
      if (ch === ">" || ch === "<") break;
      start--;
    }
    if (start === qEnd) continue;
    const text = stripTags(html.slice(start, qEnd + 1));
    consider(text);
    if (found.size >= 25) break;
  }

  return Array.from(found);
}

// ─── Author schema ────────────────────────────────────────
function detectAuthorSchema(jsonLd: unknown[]): boolean {
  for (const block of jsonLd) {
    if (!block || typeof block !== "object") continue;
    const stack: unknown[] = [block];
    while (stack.length) {
      const node = stack.pop();
      if (!node || typeof node !== "object") continue;
      const obj = node as Record<string, unknown>;
      const type = obj["@type"];
      const typeStr = Array.isArray(type) ? type.join(",") : String(type ?? "");
      if (ARTICLE_TYPES.test(typeStr)) {
        const author = obj.author;
        if (author && typeof author === "object") {
          const a = author as Record<string, unknown>;
          const aType = a["@type"];
          const aTypeStr = Array.isArray(aType)
            ? aType.join(",")
            : String(aType ?? "");
          if (/Person/i.test(aTypeStr) && typeof a.name === "string") {
            return true;
          }
        }
      }
      for (const v of Object.values(obj)) {
        if (v && typeof v === "object") stack.push(v);
      }
    }
  }
  return false;
}

function extractAuthorName(jsonLd: unknown[]): string | null {
  for (const block of jsonLd) {
    if (!block || typeof block !== "object") continue;
    const stack: unknown[] = [block];
    while (stack.length) {
      const node = stack.pop();
      if (!node || typeof node !== "object") continue;
      const obj = node as Record<string, unknown>;
      const type = obj["@type"];
      const typeStr = Array.isArray(type) ? type.join(",") : String(type ?? "");
      if (ARTICLE_TYPES.test(typeStr)) {
        const author = obj.author;
        if (author && typeof author === "object") {
          const name = (author as Record<string, unknown>).name;
          if (typeof name === "string" && name.trim()) return name.trim();
        }
      }
      for (const v of Object.values(obj)) {
        if (v && typeof v === "object") stack.push(v);
      }
    }
  }
  return null;
}

// ─── Dates ────────────────────────────────────────────────
function findDateInJsonLd(
  jsonLd: unknown[],
  key: "dateModified" | "datePublished"
): string | null {
  for (const block of jsonLd) {
    if (!block || typeof block !== "object") continue;
    const stack: unknown[] = [block];
    while (stack.length) {
      const node = stack.pop();
      if (!node || typeof node !== "object") continue;
      const obj = node as Record<string, unknown>;
      const type = obj["@type"];
      const typeStr = Array.isArray(type) ? type.join(",") : String(type ?? "");
      if (ARTICLE_TYPES.test(typeStr)) {
        const v = obj[key];
        if (typeof v === "string" && v.trim().length > 0) return v.trim();
      }
      for (const v of Object.values(obj)) {
        if (v && typeof v === "object") stack.push(v);
      }
    }
  }
  return null;
}

function extractDateModified(
  html: string,
  jsonLd: unknown[]
): { raw: string | null; source: HtmlSignals["dateModifiedSource"] } {
  const article = html.match(
    /<meta[^>]+property=["']article:modified_time["'][^>]+content=["']([^"']*)["'][^>]*>/i
  );
  if (article?.[1])
    return { raw: decode(article[1].trim()), source: "meta-article" };

  const ogUpdated = html.match(
    /<meta[^>]+property=["']og:updated_time["'][^>]+content=["']([^"']*)["'][^>]*>/i
  );
  if (ogUpdated?.[1])
    return { raw: decode(ogUpdated[1].trim()), source: "meta-og" };

  const nameLastMod = html.match(
    /<meta[^>]+name=["']last-modified["'][^>]+content=["']([^"']*)["'][^>]*>/i
  );
  if (nameLastMod?.[1])
    return { raw: decode(nameLastMod[1].trim()), source: "meta-name" };

  const fromLd = findDateInJsonLd(jsonLd, "dateModified");
  if (fromLd) return { raw: fromLd, source: "json-ld" };

  const timeEl = html.match(
    /<time[^>]+itemprop=["']dateModified["'][^>]+datetime=["']([^"']*)["'][^>]*>/i
  );
  if (timeEl?.[1])
    return { raw: decode(timeEl[1].trim()), source: "time-element" };

  return { raw: null, source: null };
}

function parseIsoDate(raw: string | null): string | null {
  if (!raw) return null;
  const t = Date.parse(raw);
  if (Number.isNaN(t)) return null;
  return new Date(t).toISOString();
}

// ─── URLs and links ───────────────────────────────────────
function resolvePageUrl(html: string): {
  pageUrl: string | null;
  pageHost: string | null;
} {
  const candidates: string[] = [];

  const canonical = html.match(
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["'][^>]*>/i
  );
  if (canonical?.[1]) candidates.push(decode(canonical[1].trim()));

  const ogUrl = html.match(
    /<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']*)["'][^>]*>/i
  );
  if (ogUrl?.[1]) candidates.push(decode(ogUrl[1].trim()));

  const base = html.match(/<base[^>]+href=["']([^"']*)["'][^>]*>/i);
  if (base?.[1]) candidates.push(decode(base[1].trim()));

  for (const c of candidates) {
    try {
      const u = new URL(c);
      if (u.protocol === "http:" || u.protocol === "https:") {
        return { pageUrl: u.href, pageHost: u.hostname.toLowerCase() };
      }
    } catch {
      /* keep trying */
    }
  }
  return { pageUrl: null, pageHost: null };
}

function urlHasLocalhost(value: unknown): boolean {
  if (typeof value !== "string" || value.trim().length === 0) return false;
  try {
    const u = new URL(value);
    const host = u.hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return /(^|\/\/)localhost(:\d+)?(\/|$)/i.test(value);
  }
}

function jsonLdHasLocalhost(node: unknown, depth = 0): boolean {
  if (depth > 6 || !node) return false;
  if (typeof node === "string") return urlHasLocalhost(node);
  if (Array.isArray(node))
    return node.some((v) => jsonLdHasLocalhost(v, depth + 1));
  if (typeof node !== "object") return false;
  const obj = node as Record<string, unknown>;
  for (const key of ["url", "@id", "sameAs", "mainEntityOfPage"]) {
    if (urlHasLocalhost(obj[key])) return true;
  }
  for (const v of Object.values(obj)) {
    if (v && typeof v === "object" && jsonLdHasLocalhost(v, depth + 1)) {
      return true;
    }
  }
  return false;
}

function extractLinks(
  html: string,
  pageHost: string | null
): { href: string; text: string; domain: string }[] {
  const links: { href: string; text: string; domain: string }[] = [];
  const re = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const m of html.matchAll(re)) {
    const href = decode(m[1].trim());
    if (
      !href ||
      href.startsWith("#") ||
      href.startsWith("mailto:") ||
      href.startsWith("tel:")
    ) {
      continue;
    }
    if (/^javascript:/i.test(href)) continue;

    let domain: string | null = null;
    try {
      const u = new URL(
        href,
        pageHost ? `https://${pageHost}` : "https://example.invalid"
      );
      domain = u.hostname.toLowerCase();
    } catch {
      continue;
    }
    if (!domain || !domain.includes(".")) continue;

    if (!pageHost) continue;

    const isExternal = domain !== pageHost && !domain.endsWith("." + pageHost);
    if (!isExternal) continue;

    const text = stripTags(m[2]).slice(0, 120);
    links.push({ href, text, domain });
  }
  return links;
}

function countAttributions(text: string): {
  count: number;
  sources: string[];
} {
  const sources: string[] = [];
  const re = new RegExp(ATTRIBUTION_PATTERN.source, "g");
  for (const m of text.matchAll(re)) {
    const name = m[1]?.trim();
    if (name) sources.push(name);
  }
  const unique = Array.from(new Set(sources));
  return { count: sources.length, sources: unique.slice(0, 5) };
}

function findVisibleByline(html: string): string | null {
  const head = html.slice(0, 20000);
  for (const m of head.matchAll(BYLINE_BLOCK_PATTERN)) {
    const inner = stripTags(m[2]);
    const match = inner.match(BYLINE_INNER_PATTERN);
    if (match?.[1]) return match[1];
  }
  return null;
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
  const authorMetaMatch = html.match(
    /<meta[^>]+name=["']author["'][^>]+content=["']([^"']*)["'][^>]*>/i
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
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  let pronounHeavySections = 0;
  for (const p of paragraphs) {
    const words = p.split(/\s+/).length;
    if (words < 20) continue;
    const pronounCount = countMatches(p, PRONOUNS);
    if (pronounCount / words > 0.08) pronounHeavySections++;
  }

  const canonicalValue = canonicalMatch
    ? decode(canonicalMatch[1].trim())
    : null;
  const hasLocalhostUrls =
    urlHasLocalhost(canonicalValue) ||
    urlHasLocalhost(openGraph["og:url"]) ||
    jsonLdHasLocalhost(jsonLd);

  const bylineName = findVisibleByline(html);

  const faqSchemaQuestions = collectFaqQuestions(jsonLd);
  const visibleFaqQuestions = collectVisibleFaqQuestions(html);

  const normalizedText = text.toLowerCase();
  const faqMatchedQuestions = faqSchemaQuestions.filter((q) => {
    const normalized = q.toLowerCase().replace(/\s+/g, " ").trim();
    if (normalized.length < 8) return false;
    return normalizedText.includes(normalized.slice(0, 60));
  });

  const { pageUrl, pageHost } = resolvePageUrl(html);
  const { raw: dateModifiedRaw, source: dateModifiedSource } =
    extractDateModified(html, jsonLd);
  const dateModifiedIso = parseIsoDate(dateModifiedRaw);
  const datePublished = findDateInJsonLd(jsonLd, "datePublished");

  const externalLinks = extractLinks(html, pageHost);
  const externalLinkDomains = Array.from(
    new Set(externalLinks.map((l) => l.domain))
  );
  const { count: namedAttributionCount, sources: attributedSources } =
    countAttributions(text);
  const hasCiteAttribute =
    /<(?:blockquote|q)\b[^>]*\bcite=["'][^"']+["']/i.test(html);

  const schemaAuthorName = extractAuthorName(jsonLd);

  return {
    text,
    headings,
    firstParagraph,
    paragraphs,
    title: titleMatch ? decode(titleMatch[1].trim()) : null,
    metaDescription: descriptionMatch
      ? decode(descriptionMatch[1].trim())
      : null,
    canonical: canonicalValue,
    openGraph,
    jsonLd,
    hasFaqSchema: detectFaqSchema(jsonLd),
    faqSchemaQuestions,
    faqMatchedQuestions,
    visibleFaqQuestions,
    questionHeadings: headings.filter((h) => h.isQuestion).length,
    factualMarkers: countMatches(text, FACTUAL_MARKERS),
    pronounHeavySections,
    selfContainedIssues: countMatches(text, SELF_CONTAINMENT_ISSUES),
    lists: (html.match(/<ul\b|<ol\b/gi) ?? []).length,
    tables: (html.match(/<table\b/gi) ?? []).length,
    hasLocalhostUrls,
    genericAltTexts: countMatches(html, GENERIC_ALT_PATTERN),
    hasAuthorMeta: Boolean(authorMetaMatch),
    hasAuthorSchema: detectAuthorSchema(jsonLd),
    hasVisibleByline: Boolean(bylineName),
    authorName: authorMetaMatch
      ? decode(authorMetaMatch[1].trim())
      : schemaAuthorName ?? bylineName ?? null,
    wordCount,

    pageUrl,
    pageHost,

    dateModified: dateModifiedRaw,
    dateModifiedIso,
    dateModifiedSource,
    datePublished,

    externalLinks,
    externalLinkDomains,
    namedAttributionCount,
    attributedSources,
    hasCiteAttribute,
  };
}