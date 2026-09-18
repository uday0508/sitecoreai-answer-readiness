export interface HtmlSignals {
  text: string;
  headings: { level: number; text: string }[];
  title: string | null;
  metaDescription: string | null;
  canonical: string | null;
  openGraph: Record<string, string>;
  jsonLd: unknown[];
  links: number;
}

function decode(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');
}

export function extractHtmlSignals(html: string): HtmlSignals {
  const headings = [...html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)]
    .map((m) => ({
      level: Number(m[1]),
      text: decode(m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()),
    }))
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

  return {
    text,
    headings,
    title: titleMatch ? decode(titleMatch[1].trim()) : null,
    metaDescription: descriptionMatch ? decode(descriptionMatch[1].trim()) : null,
    canonical: canonicalMatch ? decode(canonicalMatch[1].trim()) : null,
    openGraph,
    jsonLd,
    links: [...html.matchAll(/<a\b[^>]*href=/gi)].length,
  };
}