import Link from "next/link";
import SelfAnalysis from "./SelfAnalysis";

export const metadata = {
  metadataBase: new URL("https://sitecoreai-answer-readiness.vercel.app"),
  title: "Answer Readiness — Is your Sitecore content ready for AI answers?",
  description:
    "Deterministic AEO/GEO scoring inside SitecoreAI Page Builder. Score every page, see the evidence behind each finding, and fix what AI can't quote.",
  icons: {
    icon: "/appicon.png",
    shortcut: "/appicon.png",
    apple: "/appicon.png",
  },
  openGraph: {
    title: "Answer Readiness — SitecoreAI Marketplace App",
    description: "Deterministic AEO/GEO scoring inside SitecoreAI Page Builder.",
    url: "https://sitecoreai-answer-readiness.vercel.app",
    siteName: "Answer Readiness",
    type: "website",
  },
};

const MARKETPLACE_URL =
  "https://portal.sitecorecloud.io/marketplace/details?id=pub-35343dea-8835-4c7d-9f51-02ac96d4dc42";

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased">
      <SiteHeader />
      <Hero />
      <SelfAnalysisSection />
      <Problem />
      <HowItWorks />
      <ScoreModel />
      <Principles />
      <Honest />
      <CTA />
      <SiteFooter />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   HEADER
   ───────────────────────────────────────────────────────────────── */

function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-3 md:px-10">
        <Link href="/" className="flex items-center gap-2.5">
          <img
            src="/appicon.png"
            alt=""
            width={26}
            height={26}
            className="h-[26px] w-[26px] rounded-lg"
          />
          <span className="text-[14.5px] font-semibold tracking-tight">
            Answer Readiness
          </span>
        </Link>

        <nav className="hidden items-center gap-7 text-[13.5px] font-medium text-slate-600 md:flex">
          <a href="#live" className="transition-colors hover:text-slate-900">
            Live demo
          </a>
          <a href="#how" className="transition-colors hover:text-slate-900">
            How it works
          </a>
          <a href="#score" className="transition-colors hover:text-slate-900">
            Score model
          </a>
          <a href="#limits" className="transition-colors hover:text-slate-900">
            Limitations
          </a>
        </nav>

        <a
          href={MARKETPLACE_URL}
          className="rounded-lg bg-slate-900 px-3.5 py-1.5 text-[12.5px] font-semibold text-white shadow-sm transition-all hover:bg-slate-800"
        >
          Install
        </a>
      </div>
    </header>
  );
}

/* ─────────────────────────────────────────────────────────────────
   HERO
   ───────────────────────────────────────────────────────────────── */

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-slate-200">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-200px] h-[600px] w-[1100px] -translate-x-1/2 rounded-full bg-gradient-to-b from-indigo-100/70 via-indigo-50/40 to-transparent blur-3xl" />
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgb(226 232 240 / 0.7) 1px, transparent 1px), linear-gradient(to bottom, rgb(226 232 240 / 0.7) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage:
              "radial-gradient(ellipse 70% 60% at 50% 20%, black, transparent 75%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 70% 60% at 50% 20%, black, transparent 75%)",
          }}
        />
      </div>

      <div className="mx-auto w-full max-w-6xl px-6 pt-14 md:px-10 md:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[12px] font-medium text-slate-600 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            SitecoreAI Marketplace App
          </div>

          <h1 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-[-0.03em] text-slate-900 md:text-[56px]">
            Is your Sitecore content
            <br />
            ready for AI answers?
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-[17px] leading-relaxed text-slate-600">
            AI answer engines extract passages, not pages. Score every page
            against the signals that decide whether AI can cite it.
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <a
              href={MARKETPLACE_URL}
              className="group inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-[14px] font-semibold text-white shadow-sm transition-all hover:bg-slate-800 hover:shadow-md"
            >
              Install from Marketplace
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </a>
            <a
              href="#live"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-[14px] font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50"
            >
              See the live demo
            </a>
          </div>
        </div>

        <div className="relative mx-auto mt-12 max-w-5xl translate-y-px">
          <div className="overflow-hidden rounded-t-2xl border border-b-0 border-slate-200 bg-white shadow-[0_20px_50px_-24px_rgba(15,23,42,0.3)]">
            <PanelChrome />
            <PanelBody />
          </div>
        </div>
      </div>
    </section>
  );
}

function PanelChrome() {
  return (
    <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50/80 px-3.5 py-2">
      <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
      <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
      <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
      <div className="ml-3 flex flex-1 items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-1">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3 w-3 text-slate-400"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <span className="truncate font-mono text-[10.5px] text-slate-500">
          app.sitecorecloud.io/pages-contextpanel
        </span>
      </div>
    </div>
  );
}

function PanelBody() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[240px_1fr]">
      <div className="border-b border-slate-200 bg-white p-3.5 md:border-b-0 md:border-r">
        <div className="flex items-center gap-1.5">
          <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[9.5px] font-medium text-slate-600">
            AEO / GEO
          </span>
        </div>

        <div className="mt-3 text-[9.5px] font-semibold uppercase tracking-wider text-slate-500">
          Current page
        </div>
        <div className="mt-0.5 truncate text-[12px] font-semibold text-slate-900">
          VitaFlow Energy Drink
        </div>
        <div className="mt-0.5 truncate text-[10px] text-slate-500">
          /sitecore/content/.../FNB/VitaFlow Energy Drink
        </div>

        <div className="mt-4 flex flex-col items-center">
          <ScoreRing score={77} />
          <div className="mt-2.5 text-center">
            <div className="text-[12px] font-semibold text-amber-600">
              Needs improvement
            </div>
            <div className="mt-0.5 text-[10.5px] text-slate-500">
              4 issues to fix
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-1.5">
          <CategoryBar label="STRUCTURE" value={27} max={35} tone="amber" />
          <CategoryBar label="PASSAGE" value={21} max={25} tone="emerald" />
          <CategoryBar label="FACTS" value={20} max={20} tone="emerald" />
          <CategoryBar label="ENTITY" value={5} max={10} tone="red" />
          <CategoryBar label="FAQ" value={6} max={10} tone="amber" />
        </div>
      </div>

      <div className="bg-white p-4">
        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-50 p-0.5">
          <FilterChip label="All" count={4} active />
          <FilterChip label="Errors" count={0} tone="red" />
          <FilterChip label="Warnings" count={4} tone="amber" />
          <FilterChip label="Passed" count={7} tone="emerald" />
        </div>

        <div className="mt-3.5 space-y-2">
          <FindingRow
            severity="warning"
            title="No question-style headings detected"
            description="Only 0 of 12 headings are phrased as questions."
            recommendation="Rewrite key headings as the questions users ask."
            impact={6}
          />
          <FindingRow
            severity="warning"
            title="Opening paragraph is too short"
            description="Only about 24 words before the first section break."
            recommendation="Expand the opening to 40–80 words so AI can extract a direct answer."
            impact={5}
          />
          <FindingRow
            severity="warning"
            title="Localhost URLs detected in metadata"
            description="Canonical, OpenGraph, and JSON-LD URLs point to localhost."
            recommendation="Replace with production HTTPS URLs before publishing."
            impact={4}
            evidence="canonical: http://localhost:3000/fnb/energy-drink"
          />
        </div>

        <div className="mt-3.5 rounded-lg border border-emerald-100 bg-emerald-50/50 px-3 py-2">
          <div className="text-[9.5px] font-semibold uppercase tracking-wider text-emerald-700">
            7 passed checks
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {[
              "Answer-first paragraph",
              "Self-contained passages",
              "Factual density",
              "Entity defined",
              "Title present",
              "Meta present",
              "JSON-LD present",
            ].map((t) => (
              <span
                key={t}
                className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-medium text-emerald-800 ring-1 ring-inset ring-emerald-200"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const stroke = score >= 80 ? "#059669" : score >= 60 ? "#d97706" : "#dc2626";

  return (
    <div className="relative h-[68px] w-[68px]">
      <svg viewBox="0 0 68 68" className="h-full w-full -rotate-90">
        <circle cx="34" cy="34" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="5" />
        <circle
          cx="34"
          cy="34"
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[17px] font-bold leading-none text-slate-900">
          {score}
        </span>
        <span className="mt-0.5 text-[9px] font-medium text-slate-400">/100</span>
      </div>
    </div>
  );
}

function CategoryBar({
  label,
  value,
  max,
  tone,
}: {
  label: string;
  value: number;
  max: number;
  tone: "emerald" | "amber" | "red";
}) {
  const pct = Math.round((value / max) * 100);
  const color =
    tone === "emerald"
      ? "bg-emerald-500"
      : tone === "amber"
      ? "bg-amber-500"
      : "bg-red-500";
  const labelColor =
    tone === "emerald"
      ? "text-emerald-700"
      : tone === "amber"
      ? "text-amber-700"
      : "text-red-700";

  return (
    <div>
      <div className="flex items-center justify-between text-[9px] font-semibold uppercase tracking-wider">
        <span className={labelColor}>{label}</span>
        <span className="text-slate-500">
          {value}/{max}
        </span>
      </div>
      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function FilterChip({
  label,
  count,
  tone,
  active,
}: {
  label: string;
  count: number;
  tone?: "red" | "amber" | "emerald";
  active?: boolean;
}) {
  const chipBg =
    tone === "red"
      ? "bg-red-100 text-red-700"
      : tone === "amber"
      ? "bg-amber-100 text-amber-700"
      : tone === "emerald"
      ? "bg-emerald-100 text-emerald-700"
      : "bg-slate-200 text-slate-700";

  return (
    <div
      className={`flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-0.5 text-[10.5px] font-semibold ${
        active
          ? "bg-white text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200"
          : "text-slate-500"
      }`}
    >
      <span>{label}</span>
      <span className={`rounded-full px-1 text-[9px] font-bold ${chipBg}`}>
        {count}
      </span>
    </div>
  );
}

function FindingRow({
  severity,
  title,
  description,
  recommendation,
  impact,
  evidence,
}: {
  severity: "error" | "warning";
  title: string;
  description: string;
  recommendation: string;
  impact: number;
  evidence?: string;
}) {
  const dot = severity === "error" ? "bg-red-500" : "bg-amber-500";
  const chip =
    severity === "error"
      ? "bg-red-50 text-red-700 ring-red-200"
      : "bg-amber-50 text-amber-700 ring-amber-200";

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2.5">
      <div className="flex items-start gap-2">
        <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="text-[12px] font-semibold leading-snug text-slate-900">
              {title}
            </div>
            <span
              className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold ring-1 ring-inset ${chip}`}
            >
              Warning
            </span>
          </div>
          <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600">
            {description}
          </p>
          <p className="mt-0.5 text-[11px] italic leading-relaxed text-slate-500">
            {recommendation}
          </p>
          {evidence && (
            <div className="mt-1 inline-block max-w-full truncate rounded-md bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] text-slate-600 ring-1 ring-inset ring-slate-100">
              {evidence}
            </div>
          )}
          <div className="mt-1.5 flex items-center gap-2 text-[10px] text-slate-500">
            <span>
              <span className="font-semibold text-slate-700">+{impact}</span>{" "}
              point impact
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   LIVE SELF-ANALYSIS
   ───────────────────────────────────────────────────────────────── */

function SelfAnalysisSection() {
  return (
    <section id="live" className="border-b border-slate-200 bg-white">
      <div className="mx-auto w-full max-w-5xl px-6 py-16 md:px-10 md:py-20">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-[12px] font-semibold uppercase tracking-[0.1em] text-indigo-600">
              Live demo
            </div>
            <h2 className="mt-3 text-3xl font-semibold leading-[1.15] tracking-[-0.02em] md:text-4xl">
              Run it on this page
            </h2>
          </div>
          <p className="max-w-md text-[15px] leading-relaxed text-slate-600 md:text-right">
            Not a mockup. Not a screenshot. The engine is analyzing the page
            you are reading right now.
          </p>
        </div>

        <div className="mt-10">
          <SelfAnalysis />
        </div>

        <p className="mt-5 text-[13px] leading-relaxed text-slate-500">
          This marketing page scores poorly on answer readiness, and that is
          the point. It has the same structural problems we help you find on
          your own pages. If it scored 95, the tool would not be honest.
        </p>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────
   PROBLEM
   ───────────────────────────────────────────────────────────────── */

function Problem() {
  return (
    <section className="border-b border-slate-200 bg-slate-50">
      <div className="mx-auto w-full max-w-5xl px-6 py-16 md:px-10 md:py-20">
        <div className="max-w-3xl">
          <div className="text-[12px] font-semibold uppercase tracking-[0.1em] text-indigo-600">
            The problem
          </div>
          <h2 className="mt-3 text-3xl font-semibold leading-[1.15] tracking-[-0.02em] md:text-4xl">
            Search changed. Most content teams didn&apos;t.
          </h2>
          <div className="mt-6 space-y-4 text-[16px] leading-relaxed text-slate-600">
            <p>
              When someone asks ChatGPT, Perplexity, or Google&apos;s AI
              Overviews about your product, the answer is assembled from a
              handful of passages pulled from a handful of pages. If your
              pages aren&apos;t structured for extraction, you don&apos;t
              appear.
            </p>
            <p>
              Content teams today have no way to know which pages are ready
              and which are invisible. SEO tools measure rankings. This
              measures something different: whether AI can quote the page.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────
   HOW IT WORKS
   ───────────────────────────────────────────────────────────────── */

function HowItWorks() {
  return (
    <section id="how" className="border-b border-slate-200 bg-white">
      <div className="mx-auto w-full max-w-7xl px-6 py-16 md:px-10 md:py-20">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-[12px] font-semibold uppercase tracking-[0.1em] text-indigo-600">
              How it works
            </div>
            <h2 className="mt-3 text-3xl font-semibold leading-[1.15] tracking-[-0.02em] md:text-4xl">
              Two surfaces. One engine.
            </h2>
          </div>
          <p className="max-w-md text-[15px] leading-relaxed text-slate-600 md:text-right">
            Analyze a page while you edit it. Review the whole site before you
            plan the next sprint. Same deterministic model on both.
          </p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          <SurfaceCard
            eyebrow="Pages Context Panel"
            title="Feedback while you edit"
            body="Runs in the SitecoreAI Page Builder sidebar. Open a page and the panel returns a readiness score, a prioritized list of fixes, evidence from the page, and rewrite suggestions."
            bullets={[
              "Auto-analyzes when the page changes",
              "Priority list of top fixes",
              "Severity filter with counts",
              "Copy fix to clipboard",
            ]}
            icon={
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="#4f46e5"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                <path d="M14 2v4a2 2 0 0 0 2 2h4" />
              </svg>
            }
          />

          <SurfaceCard
            eyebrow="Fullscreen Extension"
            title="The whole site at a glance"
            body="A site-wide view with every navigation page in a tree and scores populated as pages are analyzed. A priority list ranks the pages that need attention most. Each page opens into a full report."
            bullets={[
              "Page tree with score dots",
              "Site average and distribution",
              "Priority improvements queue",
              "Batch analysis with progress",
            ]}
            icon={
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="#4f46e5"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            }
          />
        </div>
      </div>
    </section>
  );
}

function SurfaceCard({
  eyebrow,
  title,
  body,
  bullets,
  icon,
}: {
  eyebrow: string;
  title: string;
  body: string;
  bullets: string[];
  icon: React.ReactNode;
}) {
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/60">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50">
          {icon}
        </div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
          {eyebrow}
        </div>
      </div>

      <h3 className="mt-4 text-xl font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-[14.5px] leading-relaxed text-slate-600">{body}</p>

      <ul className="mt-4 space-y-1.5">
        {bullets.map((b) => (
          <li
            key={b}
            className="flex items-start gap-2 text-[13.5px] text-slate-700"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#4f46e5"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mt-1 h-2.5 w-2.5 shrink-0"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   SCORE MODEL
   ───────────────────────────────────────────────────────────────── */

function ScoreModel() {
  const rows = [
    {
      name: "Answer Structure",
      weight: 35,
      checks: "Heading hierarchy, opening paragraphs, question headings, scannable blocks",
    },
    {
      name: "Passage Integrity",
      weight: 25,
      checks: "Self-containment, pronoun density, context-dependent references",
    },
    {
      name: "Factual Density",
      weight: 20,
      checks: "Numbers, dates, comparisons, concrete claims",
    },
    {
      name: "Entity Clarity",
      weight: 10,
      checks: "Definitions, title alignment, author signals, metadata",
    },
    {
      name: "FAQ Readiness",
      weight: 10,
      checks: "Question-answer structure, FAQPage schema consistency",
    },
  ];

  return (
    <section id="score" className="border-b border-slate-200 bg-slate-50">
      <div className="mx-auto w-full max-w-7xl px-6 py-16 md:px-10 md:py-20">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-[12px] font-semibold uppercase tracking-[0.1em] text-indigo-600">
              Score model
            </div>
            <h2 className="mt-3 text-3xl font-semibold leading-[1.15] tracking-[-0.02em] md:text-4xl">
              Five weighted categories
            </h2>
          </div>
          <p className="max-w-md text-[15px] leading-relaxed text-slate-600 md:text-right">
            Deterministic, not generative. Same page, same score, every time.
          </p>
        </div>

        <div className="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200">
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 md:px-6">
                  Category
                </th>
                <th className="w-20 px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 md:px-6">
                  Weight
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 md:px-6">
                  What it checks
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.name} className="transition-colors hover:bg-slate-50/60">
                  <td className="px-5 py-4 text-[14.5px] font-medium text-slate-900 md:px-6">
                    {row.name}
                  </td>
                  <td className="px-5 py-4 text-right md:px-6">
                    <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[13px] font-semibold text-indigo-700">
                      {row.weight}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-[14px] leading-relaxed text-slate-600 md:px-6">
                    {row.checks}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────
   PRINCIPLES
   ───────────────────────────────────────────────────────────────── */

function Principles() {
  const items = [
    {
      title: "Deterministic",
      body: "No model produces the score. Auditable and reproducible.",
    },
    {
      title: "Evidence-first",
      body: "Every finding carries the sample that triggered it.",
    },
    {
      title: "Actionable",
      body: "Plain-language recommendations and rewrites you can copy.",
    },
    {
      title: "Page Builder native",
      body: "Runs where the marketer works. Same engine everywhere.",
    },
  ];

  return (
    <section className="border-b border-slate-200 bg-white">
      <div className="mx-auto w-full max-w-7xl px-6 py-16 md:px-10 md:py-20">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-[12px] font-semibold uppercase tracking-[0.1em] text-indigo-600">
              Principles
            </div>
            <h2 className="mt-3 text-3xl font-semibold leading-[1.15] tracking-[-0.02em] md:text-4xl">
              Built for teams who need to trust the number
            </h2>
          </div>
        </div>

        <div className="mt-10 divide-y divide-slate-200 border-y border-slate-200">
          {items.map((item, i) => (
            <div
              key={item.title}
              className="grid gap-2 py-5 md:grid-cols-[80px_220px_1fr] md:items-baseline md:gap-6"
            >
              <div className="font-mono text-[12px] font-semibold text-indigo-600">
                0{i + 1}
              </div>
              <div className="text-[16px] font-semibold tracking-tight text-slate-900">
                {item.title}
              </div>
              <p className="text-[14.5px] leading-relaxed text-slate-600">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────
   LIMITS
   ───────────────────────────────────────────────────────────────── */

function Honest() {
  return (
    <section id="limits" className="border-b border-slate-200 bg-slate-50">
      <div className="mx-auto w-full max-w-7xl px-6 py-16 md:px-10 md:py-20">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-[12px] font-semibold uppercase tracking-[0.1em] text-indigo-600">
              Limitations
            </div>
            <h2 className="mt-3 text-3xl font-semibold leading-[1.15] tracking-[-0.02em] md:text-4xl">
              What this is not
            </h2>
          </div>
          <p className="max-w-md text-[15px] leading-relaxed text-slate-600 md:text-right">
            Readiness is not the same as ranking. AI citation is not
            guaranteeable by any tool.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <LimitRow
            title="Not a ranking score"
            body="Internal content-readiness indicator. Does not predict or guarantee citation in any AI surface."
          />
          <LimitRow
            title="Published HTML only"
            body="Unsaved edits in Page Builder are not reflected until the page is published."
          />
          <LimitRow
            title="No crawler checks"
            body="Does not inspect robots.txt, Google-Extended, or content freshness metadata."
          />
          <LimitRow
            title="No external fact-checking"
            body="Measures structure and answer-readiness signals only, not factual accuracy."
          />
          <LimitRow
            title="No AI in the pipeline"
            body="The scoring engine is deterministic. No LLM is used to produce the score."
          />
          <LimitRow
            title="No page modifications"
            body="Reports and suggests. Does not write to your Sitecore content without a supported integration."
          />
        </div>
      </div>
    </section>
  );
}

function LimitRow({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3 w-3"
          >
            <path d="M12 8v4" />
            <path d="M12 16h.01" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[14.5px] font-semibold text-slate-900">{title}</div>
          <p className="mt-1 text-[13.5px] leading-relaxed text-slate-600">
            {body}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   CTA
   ───────────────────────────────────────────────────────────────── */

function CTA() {
  return (
    <section className="relative overflow-hidden bg-slate-950">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[400px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-b from-indigo-500/20 to-transparent blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      <div className="relative mx-auto w-full max-w-3xl px-6 py-20 text-center md:px-10 md:py-24">
        <h2 className="text-3xl font-semibold leading-[1.1] tracking-[-0.02em] text-white md:text-[44px]">
          See how ready your content is
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-slate-300">
          Install from the Sitecore Marketplace and open the panel on any page
          in Page Builder. The first analysis runs automatically.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href={MARKETPLACE_URL}
            className="group inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-[14px] font-semibold text-slate-900 shadow-lg shadow-slate-950/40 transition-all hover:bg-slate-100"
          >
            Install from Marketplace
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────
   FOOTER
   ───────────────────────────────────────────────────────────────── */

function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-4 px-6 py-7 md:flex-row md:px-10">
        <div className="flex items-center gap-2.5 text-[13.5px] text-slate-600">
          <img
            src="/appicon.png"
            alt=""
            width={22}
            height={22}
            className="h-[22px] w-[22px] rounded-md"
          />
          <span>Answer Readiness</span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-3 text-[13.5px] text-slate-600">
          <a href="#live" className="transition-colors hover:text-slate-900">
            Live demo
          </a>
          <a href="#how" className="transition-colors hover:text-slate-900">
            How it works
          </a>
          <a href="#score" className="transition-colors hover:text-slate-900">
            Score model
          </a>
          <a href="#limits" className="transition-colors hover:text-slate-900">
            Limitations
          </a>
          <a href={MARKETPLACE_URL} className="transition-colors hover:text-slate-900">
            Marketplace
          </a>
        </div>

        <div className="text-[12.5px] text-slate-400">
          © {new Date().getFullYear()}
        </div>
      </div>
    </footer>
  );
}