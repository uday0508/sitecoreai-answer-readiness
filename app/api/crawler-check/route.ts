import { NextResponse } from "next/server";

export const runtime = "nodejs";

interface CrawlerCheckRequest {
  siteUrl?: string;
}

interface CrawlerCheckResponse {
  checked: boolean;
  googleExtendedBlocked: boolean;
  llmsTxtPresent: boolean;
  error?: string;
}

async function fetchWithTimeout(url: string, timeoutMs = 5000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "SitecoreAnswerReadiness/1.0" },
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: Request): Promise<NextResponse<CrawlerCheckResponse>> {
  try {
    const body = (await request.json()) as CrawlerCheckRequest;
    const rawUrl = body.siteUrl?.trim();

    if (!rawUrl) {
      return NextResponse.json({
        checked: false,
        googleExtendedBlocked: false,
        llmsTxtPresent: false,
        error: "No site URL provided.",
      });
    }

    let baseUrl: URL;
    try {
      baseUrl = new URL(rawUrl);
    } catch {
      return NextResponse.json({
        checked: false,
        googleExtendedBlocked: false,
        llmsTxtPresent: false,
        error: "Invalid site URL.",
      });
    }

    if (baseUrl.protocol !== "https:" && baseUrl.protocol !== "http:") {
      return NextResponse.json({
        checked: false,
        googleExtendedBlocked: false,
        llmsTxtPresent: false,
        error: "Only http and https URLs are supported.",
      });
    }

    const host = baseUrl.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host.endsWith(".local") ||
      /^127\./.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    ) {
      return NextResponse.json({
        checked: false,
        googleExtendedBlocked: false,
        llmsTxtPresent: false,
        error: "Internal hosts are not supported.",
      });
    }

    const origin = baseUrl.origin;
    const robotsUrl = `${origin}/robots.txt`;
    const llmsUrl = `${origin}/llms.txt`;

    const [robotsRes, llmsRes] = await Promise.allSettled([
      fetchWithTimeout(robotsUrl),
      fetchWithTimeout(llmsUrl),
    ]);

    let googleExtendedBlocked = false;

    if (robotsRes.status === "fulfilled" && robotsRes.value.ok) {
      const robotsText = await robotsRes.value.text();
      googleExtendedBlocked = /user-agent:\s*google-extended[\s\S]*?disallow:\s*\//im.test(
        robotsText
      );
    }

    const llmsTxtPresent = llmsRes.status === "fulfilled" && llmsRes.value.ok;

    return NextResponse.json({
      checked: true,
      googleExtendedBlocked,
      llmsTxtPresent,
    });
  } catch (error) {
    return NextResponse.json({
      checked: false,
      googleExtendedBlocked: false,
      llmsTxtPresent: false,
      error: error instanceof Error ? error.message : "Crawler check failed.",
    });
  }
}