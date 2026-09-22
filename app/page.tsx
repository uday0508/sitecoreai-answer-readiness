'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import SelfAnalysis from './SelfAnalysis';

const MARKETPLACE_URL =
  'https://portal.sitecorecloud.io/marketplace/details?id=pub-35343dea-8835-4c7d-9f51-02ac96d4dc42';

const RIBBON = [
  'DETERMINISTIC',
  'NO LLM',
  'STANDARDS-BASED',
  'EVIDENCE-FIRST',
  'PAGE BUILDER NATIVE',
  'SEVEN CATEGORIES',
  'SOURCE-TAGGED',
  'PUBLISHED HTML ONLY',
];

const SCORE_ROWS = [
  { n: '01', name: 'Answer Structure', weight: 30, checks: 'Heading hierarchy, opening paragraphs, question-style headings, scannable blocks', source: 'heuristic' },
  { n: '02', name: 'Passage Integrity', weight: 22, checks: 'Self-containment, pronoun density, context-dependent references', source: 'heuristic' },
  { n: '03', name: 'Factual Density', weight: 17, checks: 'Numbers with units, dates, comparisons, concrete claims', source: 'heuristic' },
  { n: '04', name: 'Entity Clarity', weight: 9, checks: 'Definitions, title alignment, author signals, metadata hygiene', source: 'heuristic' },
  { n: '05', name: 'FAQ Readiness', weight: 8, checks: 'FAQPage schema, visible Q&A content, schema-to-content consistency', source: 'schema.org' },
  { n: '06', name: 'Freshness', weight: 8, checks: 'dateModified, article:modified_time, ISO 8601 format, staleness threshold', source: 'ogp' },
  { n: '07', name: 'Citation Signals', weight: 6, checks: 'External source links, named attributions, blockquote cite attributes', source: 'html' },
];

const MANIFESTO = [
  { n: '01', title: 'Deterministic', body: 'No model produces the score. Auditable. Reproducible. Same page, same number, every time.' },
  { n: '02', title: 'Evidence-first', body: 'Every finding carries the exact sample that triggered it. Heading text. Paragraph excerpt. Missing property.' },
  { n: '03', title: 'Disclosed', body: 'Findings backed by a published standard say so. Editorial rules say "heuristic." The user is never misled.' },
  { n: '04', title: 'Page Builder native', body: 'Runs where the marketer works. Same engine as the site-wide view. No second system to trust.' },
  { n: '05', title: 'Honest about limits', body: 'Not a ranking score. Not a citation guarantee. Published HTML only. No LLM in the pipeline.' },
];

const FAQ_ITEMS = [
  { q: 'Does this replace my SEO tools?', a: 'No. SEO tools measure ranking position. This measures whether AI answer engines can extract passages and cite your page. Both signals matter — they just answer different questions.' },
  { q: 'Does it use an LLM to produce the score?', a: 'No. The engine is a deterministic rule pipeline. No LLM, classifier, or trained model is used. Re-running the same published HTML against the same analysis timestamp and policy produces the same score.' },
  { q: 'What is the difference between a "standard" and a "heuristic"?', a: 'Standards-based findings parse published specs — Open Graph Protocol, schema.org, HTML Living Standard, Google crawler docs. Heuristic findings use editorial rules we chose. Both appear in the report, and every finding is tagged with its source.' },
  { q: 'Does it modify my content?', a: 'No. The app reads published HTML and produces findings. It does not write to Sitecore content. Rewrites are shown as before/after suggestions in the panel — you decide what to apply.' },
  { q: 'Why does my starter kit score 0 on Freshness?', a: 'Because the Sitecore starter kit does not publish a dateModified or article:modified_time on page templates. Adding one meta tag to your layout fixes it across every page.' },
  { q: 'Can I score drafts before publishing?', a: 'The engine analyzes published HTML. Unsaved edits in Page Builder are not reflected until you publish. This is deliberate — it ensures what AI crawlers actually see is what gets scored.' },
];

const NAV = [
  { id: 'hero', label: 'Intro' },
  { id: 'live', label: 'Live' },
  { id: 'problem', label: 'Problem' },
  { id: 'surfaces', label: 'Surfaces' },
  { id: 'model', label: 'Model' },
  { id: 'manifesto', label: 'Manifesto' },
  { id: 'faq', label: 'FAQ' },
];

const FONT_MONTSERRAT = "'Montserrat', ui-sans-serif, system-ui, sans-serif";
const FONT_ORBITRON = "'Orbitron', ui-monospace, monospace";

const BRAND = {
  accent: '#F79533',
  accentHover: '#E88A2E',
  accentTint: '#FFF7ED',
  accentTintBorder: '#FED7AA',
  pageBg: '#FAFAFA',
  panelBg: '#FFFFFF',
  warmPanel: '#F4F4F0',
  border: '#E5E5E5',
  borderStrong: '#D0D0D0',
  textPrimary: '#0F0F0F',
  textSecondary: '#525252',
  textMuted: '#A1A1AA',
  dark: '#141414',
};

function ArrowIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function SourceTag({ source }: { source: string }) {
  const map: Record<string, { label: string; tone: string }> = {
    heuristic: { label: 'HEURISTIC', tone: BRAND.textMuted },
    'schema.org': { label: 'SCHEMA.ORG', tone: BRAND.accent },
    ogp: { label: 'OGP', tone: BRAND.accent },
    html: { label: 'HTML', tone: BRAND.accent },
  };
  const s = map[source] ?? map.heuristic;
  return (
    <span
      className="text-[10px] font-semibold uppercase tracking-[0.15em]"
      style={{ fontFamily: FONT_ORBITRON, color: s.tone }}
    >
      {s.label}
    </span>
  );
}

function ScoreDial({ score, size = 200 }: { score: number; size?: number }) {
  const stroke = 6;
  const r = (size - stroke * 2) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const color = score >= 80 ? '#10b981' : score >= 60 ? BRAND.accent : '#ef4444';

  return (
    <div className="relative" style={{ width: `${size}px`, height: `${size}px` }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={BRAND.border}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-[42px] font-semibold leading-none tracking-tight tabular-nums"
          style={{ color: BRAND.textPrimary }}
        >
          {score}
        </span>
        <span
          className="mt-1 text-[10px] font-semibold tracking-[0.15em]"
          style={{ fontFamily: FONT_ORBITRON, color: BRAND.textMuted }}
        >
          OUT OF 100
        </span>
      </div>
    </div>
  );
}

export default function InteractiveHome() {
  const [mounted, setMounted] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const id = 'ar-fonts';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&family=Orbitron:wght@500;600;700&display=swap';
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActiveSection(e.target.id);
        });
      },
      { rootMargin: '-40% 0px -55% 0px' }
    );
    NAV.forEach((n) => {
      const el = document.getElementById(n.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;
      if (e.key === '?') {
        e.preventDefault();
        setShortcutsOpen((v) => !v);
      } else if (e.key === 'Escape') {
        setShortcutsOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div
      className="min-h-screen antialiased"
      style={{ background: BRAND.pageBg, color: BRAND.textPrimary, fontFamily: FONT_MONTSERRAT }}
    >
      <TopBar />
      {mounted && <SideRail active={activeSection} />}
      <main className="lg:pl-24">
        <Hero />
        <DiagonalRibbon />
        <LiveSection />
        <ProblemSection />
        <SurfacesSection />
        <ModelSection />
        <ManifestoSection />
        <FaqSection />
        <Finale />
        <Footer />
      </main>

      {shortcutsOpen && <ShortcutsOverlay onClose={() => setShortcutsOpen(false)} />}
      {mounted && <BackToTop />}

      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   CHROME
   ───────────────────────────────────────────────────────────── */

function TopBar() {
  return (
    <header
      className="fixed left-0 right-0 top-0 z-40 border-b backdrop-blur-xl"
      style={{ borderColor: BRAND.border, background: 'rgba(250, 250, 250, 0.95)' }}
    >
      <div className="flex h-14 items-center justify-between px-6 lg:pl-28 lg:pr-10">
        <Link href="/" className="group flex items-center gap-3">
          <img
            src="/appicon.png"
            alt=""
            width={28}
            height={28}
            className="h-7 w-7 rounded-md ring-1 transition-transform duration-500 group-hover:rotate-[8deg]"
            style={{ boxShadow: `0 0 0 1px ${BRAND.border}` }}
          />
          <span
            className="text-[13px] font-semibold uppercase tracking-[0.2em]"
            style={{ fontFamily: FONT_ORBITRON, color: BRAND.textPrimary }}
          >
            Answer Readiness
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <span
            className="hidden text-[10px] font-semibold uppercase tracking-[0.2em] md:inline"
            style={{ fontFamily: FONT_ORBITRON, color: BRAND.textMuted }}
          >
            v1.0
          </span>
          <span className="hidden h-4 w-px md:inline-block" style={{ background: BRAND.border }} />
          <a
            href={MARKETPLACE_URL}
            className="group inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] transition-all"
            style={{
              fontFamily: FONT_ORBITRON,
              borderColor: BRAND.accentTintBorder,
              background: BRAND.accentTint,
              color: BRAND.accentHover,
            }}
          >
            Install
            <ArrowIcon className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>
      </div>
    </header>
  );
}

function SideRail({ active }: { active: string }) {
  return (
    <>
      <style>{`
        .rail-item .rail-tick {
          width: 20px;
          background: ${BRAND.borderStrong};
          transition: width 500ms ease, background 300ms ease;
        }
        .rail-item .rail-label {
          color: ${BRAND.textSecondary};
          transition: color 300ms ease;
        }
        .rail-item:hover .rail-tick {
          width: 40px;
          background: ${BRAND.accent};
        }
        .rail-item:hover .rail-label {
          color: ${BRAND.accentHover};
        }
        .rail-item.active .rail-tick {
          width: 40px;
          background: ${BRAND.accent};
        }
        .rail-item.active .rail-label {
          color: ${BRAND.accentHover};
        }
        .rail-keys .rail-keys-box {
          transition: border-color 300ms ease, color 300ms ease;
        }
        .rail-keys .rail-keys-label {
          transition: color 300ms ease;
        }
        .rail-keys:hover .rail-keys-box {
          border-color: ${BRAND.accent};
          color: ${BRAND.accentHover};
        }
        .rail-keys:hover .rail-keys-label {
          color: ${BRAND.accentHover};
        }
      `}</style>

      <aside
        className="fixed bottom-0 left-0 top-14 z-30 hidden w-24 flex-col items-center justify-between border-r py-6 backdrop-blur-xl lg:flex"
        style={{ borderColor: BRAND.border, background: 'rgba(250, 250, 250, 0.8)' }}
      >
        <div className="flex flex-col gap-6">
          {NAV.map((n) => (
            <a
              key={n.id}
              href={`#${n.id}`}
              className={`rail-item flex flex-col items-center gap-2 ${active === n.id ? 'active' : ''}`}
            >
              <span className="rail-tick h-px" />
              <span
                className="rail-label text-[10px] font-semibold uppercase tracking-[0.15em]"
                style={{ fontFamily: FONT_ORBITRON }}
              >
                {n.label}
              </span>
            </a>
          ))}
        </div>

        <button
          type="button"
          onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }))}
          className="rail-keys group flex flex-col items-center gap-2"
          aria-label="Show keyboard shortcuts"
        >
          <span
            className="rail-keys-box flex h-7 w-7 items-center justify-center rounded-md border text-[12px] font-semibold"
            style={{
              fontFamily: FONT_ORBITRON,
              borderColor: BRAND.border,
              background: BRAND.panelBg,
              color: BRAND.textSecondary,
            }}
          >
            ?
          </span>
          <span
            className="rail-keys-label text-[10px] font-semibold uppercase tracking-[0.15em]"
            style={{ fontFamily: FONT_ORBITRON, color: BRAND.textSecondary }}
          >
            Keys
          </span>
        </button>
      </aside>
    </>
  );
}

function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Back to top"
      className="fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-md border"
      style={{
        borderColor: BRAND.border,
        background: BRAND.panelBg,
        color: BRAND.textPrimary,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        transform: visible ? 'translateY(0)' : 'translateY(8px)',
        boxShadow: visible ? '0 8px 24px -8px rgba(15,15,15,0.18)' : 'none',
        transition: 'opacity 300ms ease, transform 300ms ease, box-shadow 300ms ease',
      }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
        aria-hidden="true"
      >
        <path d="M12 19V5" />
        <path d="m5 12 7-7 7 7" />
      </svg>
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────
   HERO
   ───────────────────────────────────────────────────────────── */

function Hero() {
  return (
    <section id="hero" className="relative min-h-[88vh] overflow-hidden pt-14">
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage: `linear-gradient(to right, ${BRAND.border} 1px, transparent 1px), linear-gradient(to bottom, ${BRAND.border} 1px, transparent 1px)`,
          backgroundSize: '80px 80px',
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: `radial-gradient(ellipse 50% 60% at 30% 40%, ${BRAND.accentTint}, transparent 60%)` }}
      />

      <div className="relative mx-auto max-w-[1400px] px-6 py-16 lg:px-16 lg:py-20">
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-7">
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full" style={{ background: '#10b981' }} />
              <span
                className="text-[11px] font-semibold uppercase tracking-[0.25em]"
                style={{ fontFamily: FONT_ORBITRON, color: BRAND.textSecondary }}
              >
                Live on Sitecore Marketplace
              </span>
            </div>

            <h1
              className="mt-8 text-[56px] font-light leading-[0.98] tracking-[-0.04em] sm:text-[80px] lg:text-[92px]"
              style={{ color: BRAND.textPrimary }}
            >
              Ready for
              <br />
              <span className="font-semibold" style={{ color: BRAND.accent }}>
                AI answers
              </span>
            </h1>

            <p className="mt-8 max-w-lg text-[17px] leading-relaxed" style={{ color: BRAND.textSecondary }}>
              AI answer engines extract passages, not pages. Score every
              Sitecore page against the signals that decide whether AI can
              cite it.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <a
                href={MARKETPLACE_URL}
                className="group inline-flex h-12 items-center gap-3 rounded-md px-6 text-[12px] font-semibold uppercase tracking-[0.15em] text-white transition-all hover:-translate-y-px"
                style={{ fontFamily: FONT_ORBITRON, background: BRAND.dark }}
              >
                Install
                <ArrowIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </a>
              <a
                href="#live"
                className="group inline-flex h-12 items-center gap-3 rounded-md border bg-white px-6 text-[12px] font-semibold uppercase tracking-[0.15em] transition-all hover:-translate-y-px"
                style={{ fontFamily: FONT_ORBITRON, borderColor: BRAND.border, color: BRAND.textPrimary }}
              >
                Live Demo
                <ArrowIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </a>
            </div>

            <div
              className="mt-12 grid grid-cols-2 gap-x-10 gap-y-4 border-t pt-6 sm:grid-cols-4"
              style={{ borderColor: BRAND.border }}
            >
              {[
                { l: 'Categories', v: '7' },
                { l: 'Scale', v: '100' },
                { l: 'LLMs', v: '0' },
                { l: 'Surfaces', v: '2' },
              ].map((s) => (
                <div key={s.l}>
                  <div
                    className="text-[10px] font-semibold uppercase tracking-[0.2em]"
                    style={{ fontFamily: FONT_ORBITRON, color: BRAND.textMuted }}
                  >
                    {s.l}
                  </div>
                  <div className="mt-2 text-[28px] font-light tabular-nums" style={{ color: BRAND.textPrimary }}>
                    {s.v}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-12 flex items-center justify-center lg:col-span-5 lg:justify-end">
            <div className="relative">
              <div
                aria-hidden
                className="absolute inset-0 -z-10 rounded-full blur-3xl"
                style={{ background: BRAND.accentTint }}
              />
              <ScoreDial score={68} size={280} />
              <div className="mt-6 text-center lg:text-right">
                <div
                  className="text-[11px] font-semibold uppercase tracking-[0.25em]"
                  style={{ fontFamily: FONT_ORBITRON, color: BRAND.accentHover }}
                >
                  Needs Improvement
                </div>
                <div className="mt-2 text-[14px]" style={{ color: BRAND.textSecondary }}>
                  5 issues to fix on this page
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between lg:left-16 lg:right-16">
        <span
          className="text-[10px] font-semibold uppercase tracking-[0.25em]"
          style={{ fontFamily: FONT_ORBITRON, color: BRAND.textMuted }}
        >
          Scroll
        </span>
        <span
          className="text-[10px] font-semibold uppercase tracking-[0.25em]"
          style={{ fontFamily: FONT_ORBITRON, color: BRAND.textMuted }}
        >
          Press{' '}
          <kbd
            className="ml-1 rounded border bg-white px-1.5 py-0.5"
            style={{ borderColor: BRAND.border, fontFamily: FONT_ORBITRON, color: BRAND.textSecondary }}
          >
            ?
          </kbd>{' '}
          for keys
        </span>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   MARQUEE RIBBON
   ───────────────────────────────────────────────────────────── */

function DiagonalRibbon() {
  return (
    <section
      className="relative overflow-hidden border-y"
      style={{ borderColor: BRAND.border, background: BRAND.panelBg }}
    >
      <div className="flex py-4">
        <div
          className="flex w-max gap-12 whitespace-nowrap pr-12"
          style={{ animation: 'marquee 40s linear infinite' }}
        >
          {[...RIBBON, ...RIBBON].map((item, i) => (
            <span
              key={i}
              className="flex items-center gap-4 text-[12px] font-semibold uppercase tracking-[0.25em]"
              style={{ fontFamily: FONT_ORBITRON, color: BRAND.textSecondary }}
            >
              <span className="h-1.5 w-1.5 rotate-45" style={{ background: BRAND.accent }} />
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   LIVE
   ───────────────────────────────────────────────────────────── */

function LiveSection() {
  return (
    <section id="live" className="relative border-b" style={{ borderColor: BRAND.border, background: BRAND.panelBg }}>
      <div className="mx-auto max-w-[1400px] px-6 py-16 lg:px-16 lg:py-20">
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-3">
            <div
              className="text-[11px] font-semibold uppercase tracking-[0.25em]"
              style={{ fontFamily: FONT_ORBITRON, color: BRAND.accent }}
            >
              001 / Live
            </div>
            <div className="mt-3 h-px w-full lg:w-12" style={{ background: BRAND.border }} />
          </div>
          <div className="col-span-12 lg:col-span-9">
            <h2
              className="text-[36px] font-light leading-[1.05] tracking-[-0.03em] sm:text-[48px] lg:text-[56px]"
              style={{ color: BRAND.textPrimary }}
            >
              Run it on <span className="font-semibold">this page</span>
            </h2>
            <p className="mt-5 max-w-2xl text-[17px] leading-relaxed" style={{ color: BRAND.textSecondary }}>
              Not a mockup. The engine is analyzing the page you are reading
              right now. Every finding below is real.
            </p>
          </div>
        </div>

        <div className="mt-10 border p-1" style={{ borderColor: BRAND.border, background: BRAND.warmPanel }}>
          <div className="border bg-white p-6 lg:p-8" style={{ borderColor: BRAND.border }}>
            <SelfAnalysis />
          </div>
        </div>

        <p
          className="mt-6 max-w-2xl text-[11px] font-semibold uppercase tracking-[0.15em]"
          style={{ fontFamily: FONT_ORBITRON, color: BRAND.textMuted }}
        >
          This marketing page scores poorly — and that is the point. If it
          scored 95, we would be lying.
        </p>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   PROBLEM
   ───────────────────────────────────────────────────────────── */

function ProblemSection() {
  return (
    <section id="problem" className="relative border-b" style={{ borderColor: BRAND.border, background: BRAND.warmPanel }}>
      <div className="mx-auto max-w-[1400px] px-6 py-16 lg:px-16 lg:py-20">
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-3">
            <div
              className="text-[11px] font-semibold uppercase tracking-[0.25em]"
              style={{ fontFamily: FONT_ORBITRON, color: BRAND.accent }}
            >
              002 / Problem
            </div>
            <div className="mt-3 h-px w-full lg:w-12" style={{ background: BRAND.border }} />
          </div>
          <div className="col-span-12 lg:col-span-9">
            <h2
              className="text-[36px] font-light leading-[1.05] tracking-[-0.03em] sm:text-[48px] lg:text-[56px]"
              style={{ color: BRAND.textPrimary }}
            >
              Search changed.
              <br />
              <span className="font-semibold">Content teams didn&apos;t.</span>
            </h2>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-6 lg:col-start-4">
            <p className="text-[20px] font-light leading-[1.6]" style={{ color: BRAND.textPrimary }}>
              When someone asks ChatGPT, Perplexity, or Google&apos;s AI
              Overviews about your product, the answer is assembled from a
              handful of passages pulled from a handful of pages.
            </p>
          </div>

          <div className="col-span-12 lg:col-span-3 lg:col-start-4">
            <div className="mt-8 border-l-2 pl-6" style={{ borderColor: BRAND.accent }}>
              <p className="text-[15px] leading-relaxed" style={{ color: BRAND.textSecondary }}>
                If your pages aren&apos;t structured for extraction, you
                don&apos;t appear.
              </p>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-4 lg:col-start-8">
            <div className="mt-8 border-l-2 pl-6" style={{ borderColor: BRAND.borderStrong }}>
              <p className="text-[15px] leading-relaxed" style={{ color: BRAND.textSecondary }}>
                SEO tools measure rankings. This measures something different:
                whether AI can quote the page.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   SURFACES
   ───────────────────────────────────────────────────────────── */

function SurfacesSection() {
  return (
    <section id="surfaces" className="relative border-b" style={{ borderColor: BRAND.border, background: BRAND.panelBg }}>
      <div className="mx-auto max-w-[1400px] px-6 py-16 lg:px-16 lg:py-20">
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-3">
            <div
              className="text-[11px] font-semibold uppercase tracking-[0.25em]"
              style={{ fontFamily: FONT_ORBITRON, color: BRAND.accent }}
            >
              003 / Surfaces
            </div>
            <div className="mt-3 h-px w-full lg:w-12" style={{ background: BRAND.border }} />
          </div>
          <div className="col-span-12 lg:col-span-9">
            <h2
              className="text-[36px] font-light leading-[1.05] tracking-[-0.03em] sm:text-[48px] lg:text-[56px]"
              style={{ color: BRAND.textPrimary }}
            >
              Two surfaces.
              <br />
              <span className="font-semibold">One engine.</span>
            </h2>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-12 gap-6">
          {[
            {
              n: '01',
              title: 'Pages Context Panel',
              tag: 'Inline',
              body: 'Runs in the SitecoreAI Page Builder sidebar. Open a page — the panel returns a score, a prioritized list of fixes, evidence, and rewrite suggestions.',
              bullets: ['Auto-analyzes on edit', 'Priority fix queue', 'Severity filter with counts', 'Source tags on every finding'],
            },
            {
              n: '02',
              title: 'Fullscreen Extension',
              tag: 'Site-wide',
              body: 'A site-wide view with every navigation page in a tree and scores populated as pages are analyzed. A priority list ranks the pages that need attention most.',
              bullets: ['Page tree with score dots', 'Site average and distribution', 'Priority improvements queue', 'Batch analysis with progress'],
            },
          ].map((c) => (
            <div key={c.n} className="col-span-12 lg:col-span-6">
              <div
                className="group relative overflow-hidden border bg-white p-8 transition-all hover:-translate-y-px hover:shadow-lg lg:p-10"
                style={{ borderColor: BRAND.border }}
              >
                <div className="flex items-baseline justify-between">
                  <span
                    className="text-[11px] font-semibold uppercase tracking-[0.25em]"
                    style={{ fontFamily: FONT_ORBITRON, color: BRAND.textMuted }}
                  >
                    {c.n}
                  </span>
                  <span
                    className="text-[10px] font-semibold uppercase tracking-[0.25em]"
                    style={{ fontFamily: FONT_ORBITRON, color: BRAND.accent }}
                  >
                    {c.tag}
                  </span>
                </div>
                <h3 className="mt-6 text-[26px] font-semibold tracking-[-0.02em]" style={{ color: BRAND.textPrimary }}>
                  {c.title}
                </h3>
                <p className="mt-4 text-[15px] leading-relaxed" style={{ color: BRAND.textSecondary }}>
                  {c.body}
                </p>
                <ul className="mt-6 space-y-2.5 border-t pt-6" style={{ borderColor: BRAND.border }}>
                  {c.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-3 text-[14px]" style={{ color: BRAND.textPrimary }}>
                      <span className="mt-2 h-1 w-3" style={{ background: BRAND.accent }} />
                      {b}
                    </li>
                  ))}
                </ul>
                <span
                  className="absolute bottom-0 left-0 h-1 w-0 transition-all duration-700 group-hover:w-full"
                  style={{ background: BRAND.accent }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   MODEL
   ───────────────────────────────────────────────────────────── */

function ModelSection() {
  return (
    <section id="model" className="relative border-b" style={{ borderColor: BRAND.border, background: BRAND.warmPanel }}>
      <div className="mx-auto max-w-[1400px] px-6 py-16 lg:px-16 lg:py-20">
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-3">
            <div
              className="text-[11px] font-semibold uppercase tracking-[0.25em]"
              style={{ fontFamily: FONT_ORBITRON, color: BRAND.accent }}
            >
              004 / Model
            </div>
            <div className="mt-3 h-px w-full lg:w-12" style={{ background: BRAND.border }} />
          </div>
          <div className="col-span-12 lg:col-span-9">
            <h2
              className="text-[36px] font-light leading-[1.05] tracking-[-0.03em] sm:text-[48px] lg:text-[56px]"
              style={{ color: BRAND.textPrimary }}
            >
              Seven categories.
              <br />
              <span className="font-semibold">One hundred points.</span>
            </h2>
          </div>
        </div>

        <div className="mt-12 border-t" style={{ borderColor: BRAND.border }}>
          {SCORE_ROWS.map((row) => (
            <div
              key={row.n}
              className="group grid grid-cols-12 items-center gap-6 border-b py-6 transition-colors hover:bg-white"
              style={{ borderColor: BRAND.border }}
            >
              <div
                className="col-span-2 text-[12px] font-semibold uppercase tracking-[0.25em] lg:col-span-1"
                style={{ fontFamily: FONT_ORBITRON, color: BRAND.textMuted }}
              >
                {row.n}
              </div>
              <div className="col-span-10 lg:col-span-4">
                <div className="text-[22px] font-semibold tracking-[-0.01em] lg:text-[24px]" style={{ color: BRAND.textPrimary }}>
                  {row.name}
                </div>
              </div>
              <div className="col-span-12 lg:col-span-5">
                <p className="text-[14px] leading-relaxed" style={{ color: BRAND.textSecondary }}>
                  {row.checks}
                </p>
              </div>
              <div className="col-span-8 lg:col-span-1">
                <SourceTag source={row.source} />
              </div>
              <div className="col-span-4 text-right lg:col-span-1">
                <span className="text-[26px] font-light tabular-nums lg:text-[30px]" style={{ color: BRAND.textPrimary }}>
                  {row.weight}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 grid grid-cols-12 items-center gap-6">
          <div className="col-span-12 lg:col-span-9 lg:col-start-4">
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.15em]"
              style={{ fontFamily: FONT_ORBITRON, color: BRAND.textMuted }}
            >
              Standards-based detection. Editorial scoring, disclosed in-app.
            </p>
          </div>
          <div className="col-span-12 lg:col-span-2 lg:col-start-11">
            <div className="flex items-baseline justify-end gap-3">
              <span
                className="text-[11px] font-semibold uppercase tracking-[0.25em]"
                style={{ fontFamily: FONT_ORBITRON, color: BRAND.textMuted }}
              >
                Total
              </span>
              <span className="text-[34px] font-light tabular-nums" style={{ color: BRAND.accent }}>
                100
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   MANIFESTO
   ───────────────────────────────────────────────────────────── */

function ManifestoSection() {
  return (
    <section id="manifesto" className="relative border-b" style={{ borderColor: BRAND.border, background: BRAND.panelBg }}>
      <div className="mx-auto max-w-[1400px] px-6 py-16 lg:px-16 lg:py-20">
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-3">
            <div
              className="text-[11px] font-semibold uppercase tracking-[0.25em]"
              style={{ fontFamily: FONT_ORBITRON, color: BRAND.accent }}
            >
              005 / Manifesto
            </div>
            <div className="mt-3 h-px w-full lg:w-12" style={{ background: BRAND.border }} />
          </div>
          <div className="col-span-12 lg:col-span-9">
            <h2
              className="text-[36px] font-light leading-[1.05] tracking-[-0.03em] sm:text-[48px] lg:text-[56px]"
              style={{ color: BRAND.textPrimary }}
            >
              Built for teams
              <br />
              <span className="font-semibold">who need to trust the number.</span>
            </h2>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-12 gap-x-6 gap-y-12">
          {MANIFESTO.map((m, i) => (
            <div
              key={m.n}
              className={`col-span-12 ${i % 2 === 0 ? 'lg:col-span-5' : 'lg:col-span-5 lg:col-start-8'}`}
            >
              <div className="border-t-2 pt-5" style={{ borderColor: BRAND.border }}>
                <div className="flex items-baseline justify-between">
                  <span
                    className="text-[11px] font-semibold uppercase tracking-[0.25em]"
                    style={{ fontFamily: FONT_ORBITRON, color: BRAND.textMuted }}
                  >
                    {m.n}
                  </span>
                  <span className="h-2 w-2 rounded-full" style={{ background: BRAND.accent }} />
                </div>
                <h3 className="mt-5 text-[28px] font-light tracking-[-0.02em]" style={{ color: BRAND.textPrimary }}>
                  {m.title}
                </h3>
                <p className="mt-3 text-[15.5px] leading-relaxed" style={{ color: BRAND.textSecondary }}>
                  {m.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   FAQ
   ───────────────────────────────────────────────────────────── */

function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="relative border-b" style={{ borderColor: BRAND.border, background: BRAND.warmPanel }}>
      <div className="mx-auto max-w-[1400px] px-6 py-16 lg:px-16 lg:py-20">
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-3">
            <div
              className="text-[11px] font-semibold uppercase tracking-[0.25em]"
              style={{ fontFamily: FONT_ORBITRON, color: BRAND.accent }}
            >
              006 / FAQ
            </div>
            <div className="mt-3 h-px w-full lg:w-12" style={{ background: BRAND.border }} />
          </div>
          <div className="col-span-12 lg:col-span-9">
            <h2
              className="text-[36px] font-light leading-[1.05] tracking-[-0.03em] sm:text-[48px] lg:text-[56px]"
              style={{ color: BRAND.textPrimary }}
            >
              Frequently
              <br />
              <span className="font-semibold">asked.</span>
            </h2>
          </div>
        </div>

        <div className="mt-12 border-t" style={{ borderColor: BRAND.border }}>
          {FAQ_ITEMS.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.q} className="border-b" style={{ borderColor: BRAND.border }}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="group flex w-full items-start gap-6 py-6 text-left"
                >
                  <span
                    className="mt-2 text-[11px] font-semibold uppercase tracking-[0.25em]"
                    style={{ fontFamily: FONT_ORBITRON, color: BRAND.textMuted }}
                  >
                    Q{String(i + 1).padStart(2, '0')}
                  </span>
                  <span
                    className="min-w-0 flex-1 text-[20px] font-light leading-[1.35] tracking-[-0.01em] lg:text-[24px]"
                    style={{ color: isOpen ? BRAND.accentHover : BRAND.textPrimary }}
                  >
                    {item.q}
                  </span>
                  <span
                    className="mt-2 shrink-0 text-[16px]"
                    style={{
                      fontFamily: FONT_ORBITRON,
                      color: isOpen ? BRAND.accent : BRAND.textMuted,
                      transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
                      transition: 'transform 300ms ease, color 300ms ease',
                    }}
                  >
                    +
                  </span>
                </button>
                <div
                  className="grid overflow-hidden transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                  style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
                >
                  <div className="min-h-0">
                    <div className="grid grid-cols-12 gap-6 pb-6">
                      <div className="col-span-12 lg:col-span-2 lg:col-start-2">
                        <span
                          className="text-[10px] font-semibold uppercase tracking-[0.25em]"
                          style={{ fontFamily: FONT_ORBITRON, color: BRAND.textMuted }}
                        >
                          Answer
                        </span>
                      </div>
                      <div className="col-span-12 lg:col-span-8">
                        <p className="text-[15.5px] leading-relaxed" style={{ color: BRAND.textSecondary }}>
                          {item.a}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   FINALE
   ───────────────────────────────────────────────────────────── */

function Finale() {
  return (
    <section className="relative overflow-hidden border-b" style={{ borderColor: BRAND.border, background: BRAND.panelBg }}>
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: `radial-gradient(ellipse 60% 60% at 50% 100%, ${BRAND.accentTint}, transparent 70%)` }}
      />

      <div className="relative mx-auto max-w-[1400px] px-6 py-24 lg:px-16 lg:py-28">
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-2">
            <div
              className="text-[11px] font-semibold uppercase tracking-[0.25em]"
              style={{ fontFamily: FONT_ORBITRON, color: BRAND.accent }}
            >
              007 / End
            </div>
          </div>
          <div className="col-span-12 lg:col-span-10">
            <h2
              className="text-[40px] font-light leading-[1.02] tracking-[-0.04em] sm:text-[64px] lg:text-[80px]"
              style={{ color: BRAND.textPrimary }}
            >
              Ready to see
              <br />
              <span className="font-semibold">how ready you are?</span>
            </h2>

            <div className="mt-12 flex flex-wrap items-center gap-4">
              <a
                href={MARKETPLACE_URL}
                className="group inline-flex h-14 items-center gap-3 rounded-md px-8 text-[12px] font-semibold uppercase tracking-[0.2em] text-white transition-all hover:-translate-y-px"
                style={{ fontFamily: FONT_ORBITRON, background: BRAND.dark }}
              >
                Install from Marketplace
                <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
              <a
                href="#live"
                className="group inline-flex h-14 items-center gap-3 rounded-md border bg-white px-8 text-[12px] font-semibold uppercase tracking-[0.2em] transition-all hover:-translate-y-px"
                style={{ fontFamily: FONT_ORBITRON, borderColor: BRAND.border, color: BRAND.textPrimary }}
              >
                Re-run the demo
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   FOOTER
   ───────────────────────────────────────────────────────────── */

function Footer() {
  return (
    <footer className="relative" style={{ background: BRAND.pageBg }}>
      <div className="mx-auto max-w-[1400px] px-6 py-10 lg:px-16">
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-4">
            <div className="flex items-center gap-3">
              <img
                src="/appicon.png"
                alt=""
                width={24}
                height={24}
                className="h-6 w-6 rounded-md ring-1"
                style={{ boxShadow: `0 0 0 1px ${BRAND.border}` }}
              />
              <span
                className="text-[12px] font-semibold uppercase tracking-[0.2em]"
                style={{ fontFamily: FONT_ORBITRON, color: BRAND.textPrimary }}
              >
                Answer Readiness
              </span>
            </div>
            <p className="mt-3 max-w-sm text-[13px] leading-relaxed" style={{ color: BRAND.textMuted }}>
              A SitecoreAI Marketplace app by BizTechnoSys. Deterministic
              AEO/GEO scoring inside Page Builder.
            </p>
          </div>

          <div className="col-span-6 lg:col-span-2 lg:col-start-7">
            <div
              className="text-[10px] font-semibold uppercase tracking-[0.25em]"
              style={{ fontFamily: FONT_ORBITRON, color: BRAND.textMuted }}
            >
              Site
            </div>
            <ul className="mt-3 space-y-2 text-[13px]">
              <li>
                <a href="#live" style={{ color: BRAND.textSecondary }}>
                  Live demo
                </a>
              </li>
              <li>
                <a href="#model" style={{ color: BRAND.textSecondary }}>
                  Score model
                </a>
              </li>
              <li>
                <a href="#manifesto" style={{ color: BRAND.textSecondary }}>
                  Manifesto
                </a>
              </li>
              <li>
                <a href="#faq" style={{ color: BRAND.textSecondary }}>
                  FAQ
                </a>
              </li>
            </ul>
          </div>

          <div className="col-span-6 lg:col-span-2">
            <div
              className="text-[10px] font-semibold uppercase tracking-[0.25em]"
              style={{ fontFamily: FONT_ORBITRON, color: BRAND.textMuted }}
            >
              External
            </div>
            <ul className="mt-3 space-y-2 text-[13px]">
              <li>
                <a href={MARKETPLACE_URL} style={{ color: BRAND.textSecondary }}>
                  Marketplace
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/uday0508/sitecoreai-answer-readiness"
                  style={{ color: BRAND.textSecondary }}
                >
                  GitHub
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div
          className="mt-10 flex flex-col items-start justify-between gap-4 border-t pt-6 sm:flex-row sm:items-center"
          style={{ borderColor: BRAND.border }}
        >
          <div
            className="text-[10px] font-semibold uppercase tracking-[0.25em]"
            style={{ fontFamily: FONT_ORBITRON, color: BRAND.textMuted }}
          >
            © {new Date().getFullYear()} BizTechnoSys
          </div>
          <div
            className="text-[10px] font-semibold uppercase tracking-[0.25em]"
            style={{ fontFamily: FONT_ORBITRON, color: BRAND.textMuted }}
          >
            Not a ranking score · Not a citation guarantee
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ─────────────────────────────────────────────────────────────
   SHORTCUTS OVERLAY
   ───────────────────────────────────────────────────────────── */

function ShortcutsOverlay({ onClose }: { onClose: () => void }) {
  const shortcuts = [
    { key: '?', label: 'Toggle this overlay' },
    { key: 'Esc', label: 'Close any modal' },
  ];
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      onClick={onClose}
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ background: 'rgba(15, 15, 15, 0.4)' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md border bg-white p-8 shadow-2xl"
        style={{ borderColor: BRAND.border }}
      >
        <div className="flex items-center justify-between">
          <span
            className="text-[11px] font-semibold uppercase tracking-[0.25em]"
            style={{ fontFamily: FONT_ORBITRON, color: BRAND.textSecondary }}
          >
            Keyboard
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-[14px]"
            style={{ fontFamily: FONT_ORBITRON, color: BRAND.textMuted }}
          >
            ✕
          </button>
        </div>
        <ul className="mt-8 space-y-4">
          {shortcuts.map((s) => (
            <li
              key={s.key}
              className="flex items-center justify-between gap-3 border-b pb-3"
              style={{ borderColor: BRAND.border }}
            >
              <span className="text-[14px]" style={{ color: BRAND.textPrimary }}>
                {s.label}
              </span>
              <kbd
                className="border px-2.5 py-1 text-[11px]"
                style={{
                  fontFamily: FONT_ORBITRON,
                  borderColor: BRAND.border,
                  background: BRAND.pageBg,
                  color: BRAND.textSecondary,
                }}
              >
                {s.key}
              </kbd>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}