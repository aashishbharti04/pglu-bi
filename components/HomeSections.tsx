"use client";

import type { ReactNode } from "react";
import { TEMPLATES, type TemplateId } from "@/lib/templates";

function SectionHead({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string;
  title: string;
  sub?: string;
}) {
  return (
    <div className="section-head">
      <span className="hero-eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      {sub && <p className="muted">{sub}</p>}
    </div>
  );
}

/* ---------- How it works ---------- */

const STEPS = [
  {
    n: "01",
    title: "Drop a file",
    text: "CSV, Excel, or JSON. The browser parses it and profiles every column — types, ranges, distinct values — in a second or two.",
  },
  {
    n: "02",
    title: "Pick a template — or let AI design it",
    text: "Five pro templates adapt to your data's shape instantly. With an API key, Claude designs the layout and writes insights grounded in real aggregates.",
  },
  {
    n: "03",
    title: "Refine, filter, share",
    text: "Reshape anything by chat, slice with global filters, swap chart types, then export the whole dashboard as a single file anyone can re-open.",
  },
];

export function HowItWorks() {
  return (
    <section className="section" id="how">
      <SectionHead
        eyebrow="How it works"
        title="Three steps, no setup"
      />
      <div className="steps">
        {STEPS.map((s) => (
          <div key={s.n} className="step">
            <span className="step-n">{s.n}</span>
            <span className="step-title">{s.title}</span>
            <span className="step-text muted">{s.text}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- Templates showcase ---------- */

type Cell = [number, "k" | "c" | "t"]; // [flex width, kpi | chart | table]

const LAYOUTS: Record<TemplateId, Cell[][]> = {
  executive: [
    [
      [1, "k"],
      [1, "k"],
      [1, "k"],
      [1, "k"],
    ],
    [[1, "c"]],
    [
      [1, "c"],
      [1, "c"],
    ],
  ],
  sales: [
    [
      [1, "k"],
      [1, "k"],
      [1, "k"],
      [1, "k"],
    ],
    [[1, "c"]],
    [
      [1, "c"],
      [1, "c"],
    ],
    [[1, "t"]],
  ],
  trends: [
    [
      [1, "k"],
      [1, "k"],
      [1, "k"],
    ],
    [[1, "c"]],
    [
      [1, "c"],
      [1, "c"],
    ],
    [[1, "c"]],
  ],
  breakdown: [
    [
      [1, "k"],
      [1, "k"],
    ],
    [
      [1, "c"],
      [1, "c"],
    ],
    [
      [1, "c"],
      [1, "c"],
    ],
  ],
  explorer: [
    [
      [1, "k"],
      [1, "k"],
      [1, "k"],
      [1, "k"],
    ],
    [
      [1, "c"],
      [1, "c"],
      [1, "c"],
    ],
    [
      [1, "c"],
      [1, "t"],
    ],
  ],
};

function MiniLayout({ id }: { id: TemplateId }) {
  return (
    <div className="mini" aria-hidden>
      {LAYOUTS[id].map((row, i) => (
        <div key={i} className="mini-row">
          {row.map(([w, kind], j) => (
            <span key={j} className={`mini-cell mini-${kind}`} style={{ flex: w }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function TemplatesShowcase() {
  return (
    <section className="section" id="templates">
      <SectionHead
        eyebrow="Templates"
        title="Five layouts that adapt to your data"
        sub="Each template inspects your columns — money-like measures, categories, dates — and arranges the right widgets. No API key needed; switch templates on any dashboard at any time."
      />
      <div className="showcase-grid">
        {TEMPLATES.map((t) => (
          <div key={t.id} className="showcase-card">
            <MiniLayout id={t.id} />
            <span className="template-name">
              <span className="template-icon">{t.icon}</span> {t.name}
            </span>
            <span className="template-desc muted">{t.description}</span>
          </div>
        ))}
        <div className="showcase-card showcase-ai">
          <div className="mini mini-ai" aria-hidden>
            <span className="mini-spark">✨</span>
          </div>
          <span className="template-name">
            <span className="template-icon">✨</span> AI designed
          </span>
          <span className="template-desc muted">
            Claude invents the layout for your specific dataset and writes
            insights citing real numbers.
          </span>
        </div>
      </div>
    </section>
  );
}

/* ---------- Chart gallery ---------- */

const G = "currentColor";

const GLYPHS: [string, ReactNode][] = [
  [
    "KPI + sparkline",
    <svg key="kpi" viewBox="0 0 16 16">
      <rect x="1" y="2" width="9" height="4" rx="1" fill={G} />
      <polyline points="1,13 5,10 9,12 15,7" fill="none" stroke={G} strokeWidth="1.6" />
    </svg>,
  ],
  [
    "Bar",
    <svg key="bar" viewBox="0 0 16 16">
      <rect x="2" y="7" width="3" height="8" rx="0.8" fill={G} />
      <rect x="6.5" y="3" width="3" height="12" rx="0.8" fill={G} />
      <rect x="11" y="9" width="3" height="6" rx="0.8" fill={G} />
    </svg>,
  ],
  [
    "Horizontal bar",
    <svg key="hbar" viewBox="0 0 16 16">
      <rect x="1" y="2" width="12" height="3" rx="0.8" fill={G} />
      <rect x="1" y="6.5" width="8" height="3" rx="0.8" fill={G} />
      <rect x="1" y="11" width="5" height="3" rx="0.8" fill={G} />
    </svg>,
  ],
  [
    "Stacked bar",
    <svg key="stacked" viewBox="0 0 16 16">
      <rect x="2" y="8" width="3" height="7" fill={G} />
      <rect x="2" y="4" width="3" height="3.4" fill={G} opacity="0.45" />
      <rect x="6.5" y="6" width="3" height="9" fill={G} />
      <rect x="6.5" y="2" width="3" height="3.4" fill={G} opacity="0.45" />
      <rect x="11" y="10" width="3" height="5" fill={G} />
      <rect x="11" y="7" width="3" height="2.4" fill={G} opacity="0.45" />
    </svg>,
  ],
  [
    "Line",
    <svg key="line" viewBox="0 0 16 16">
      <polyline points="1,12 5,7 9,9 15,3" fill="none" stroke={G} strokeWidth="1.8" />
    </svg>,
  ],
  [
    "Area",
    <svg key="area" viewBox="0 0 16 16">
      <path d="M1,12 5,7 9,9 15,3 15,15 1,15 Z" fill={G} opacity="0.35" />
      <polyline points="1,12 5,7 9,9 15,3" fill="none" stroke={G} strokeWidth="1.6" />
    </svg>,
  ],
  [
    "Pie",
    <svg key="pie" viewBox="0 0 16 16">
      <circle cx="8" cy="8" r="6.4" fill={G} opacity="0.35" />
      <path d="M8,8 L8,1.6 A6.4,6.4 0 0 1 14.2,9.6 Z" fill={G} />
    </svg>,
  ],
  [
    "Donut",
    <svg key="donut" viewBox="0 0 16 16">
      <circle cx="8" cy="8" r="5" fill="none" stroke={G} strokeWidth="3" opacity="0.35" />
      <circle
        cx="8"
        cy="8"
        r="5"
        fill="none"
        stroke={G}
        strokeWidth="3"
        strokeDasharray="19 31"
        transform="rotate(-90 8 8)"
      />
    </svg>,
  ],
  [
    "Scatter",
    <svg key="scatter" viewBox="0 0 16 16">
      <circle cx="4" cy="11" r="1.7" fill={G} />
      <circle cx="8" cy="6" r="1.7" fill={G} />
      <circle cx="12" cy="9" r="1.7" fill={G} opacity="0.55" />
      <circle cx="13" cy="3" r="1.7" fill={G} />
    </svg>,
  ],
  [
    "Treemap",
    <svg key="treemap" viewBox="0 0 16 16">
      <rect x="1" y="1" width="8" height="14" rx="1" fill={G} />
      <rect x="10" y="1" width="5" height="8" rx="1" fill={G} opacity="0.55" />
      <rect x="10" y="10" width="5" height="5" rx="1" fill={G} opacity="0.3" />
    </svg>,
  ],
  [
    "Heatmap",
    <svg key="heatmap" viewBox="0 0 16 16">
      {[0, 1, 2].flatMap((r) =>
        [0, 1, 2].map((c) => (
          <rect
            key={`${r}${c}`}
            x={1 + c * 5}
            y={1 + r * 5}
            width="4"
            height="4"
            rx="0.8"
            fill={G}
            opacity={[0.9, 0.3, 0.55, 0.4, 0.75, 0.2, 0.6, 0.35, 0.85][r * 3 + c]}
          />
        ))
      )}
    </svg>,
  ],
  [
    "Funnel",
    <svg key="funnel" viewBox="0 0 16 16">
      <rect x="1" y="2" width="14" height="3" rx="0.8" fill={G} />
      <rect x="3.5" y="6.5" width="9" height="3" rx="0.8" fill={G} opacity="0.6" />
      <rect x="5.5" y="11" width="5" height="3" rx="0.8" fill={G} opacity="0.35" />
    </svg>,
  ],
  [
    "Table",
    <svg key="table" viewBox="0 0 16 16">
      <rect x="1" y="2" width="14" height="2.4" rx="0.8" fill={G} />
      <rect x="1" y="6" width="14" height="1.4" fill={G} opacity="0.4" />
      <rect x="1" y="9" width="14" height="1.4" fill={G} opacity="0.4" />
      <rect x="1" y="12" width="14" height="1.4" fill={G} opacity="0.4" />
    </svg>,
  ],
];

export function ChartGallery() {
  return (
    <section className="section" id="charts">
      <SectionHead
        eyebrow="Visualization"
        title="Thirteen chart types, one design system"
        sub="A colorblind-validated palette with separately tuned light and dark steps. Switch any widget between compatible types from its menu."
      />
      <div className="glyph-grid">
        {GLYPHS.map(([name, svg]) => (
          <div key={name} className="glyph-chip">
            <span className="glyph-icon">{svg}</span>
            <span>{name}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- About ---------- */

export function About() {
  return (
    <section className="section" id="about">
      <SectionHead eyebrow="About" title="BI that lives in your browser" />
      <div className="about-cols">
        <p>
          Pglu BI is an experiment in <strong>AI-first business
          intelligence</strong>: instead of dragging fields onto shelves, you
          hand over a file and get a finished, editable dashboard back. The
          heavy lifting — parsing, profiling, aggregation, rendering — happens
          entirely client-side, so it deploys as a static site and your data
          never touches a server.
        </p>
        <p>
          The AI layer is optional and transparent. With a key, Claude
          receives your <em>column profiles, five sample rows, and
          precomputed aggregates</em> — not the full dataset — and returns a
          schema-validated dashboard spec that the local query engine
          executes. Built with Next.js, Apache ECharts, and the Anthropic
          API; open source on{" "}
          <a
            href="https://github.com/aashishbharti04/pglu-bi"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
          .
        </p>
      </div>
    </section>
  );
}

/* ---------- FAQ ---------- */

const FAQS = [
  {
    q: "Is my data uploaded anywhere?",
    a: "No. Files are parsed in your browser and stored in localStorage; every chart is computed locally. If you enable AI, only column profiles, five sample rows, and precomputed aggregates are sent to Anthropic — never the full dataset.",
  },
  {
    q: "Do I need an API key?",
    a: "No. The five templates, all chart types, filters, and exports work without one. An Anthropic API key (added in Settings) unlocks AI-designed dashboards, written insights, and chat editing.",
  },
  {
    q: "What files can I upload?",
    a: "CSV, TSV, Excel (.xlsx/.xls), JSON arrays, and .pglu.json bundles exported from Pglu BI. Browser storage caps a dataset at roughly 4 MB — use an extract for very large data.",
  },
  {
    q: "How do I share a dashboard?",
    a: "Open it and click Export. That downloads a single .pglu.json file containing the dashboard and its data. Anyone can drop that file onto the Pglu BI home page to restore it — no account needed.",
  },
  {
    q: "Which AI model does it use?",
    a: "Claude Opus 4.8, called directly from your browser with your own key and structured JSON output, so dashboard specs are always valid.",
  },
];

export function Faq() {
  return (
    <section className="section" id="faq">
      <SectionHead eyebrow="FAQ" title="Common questions" />
      <div className="faq-list">
        {FAQS.map((f) => (
          <details key={f.q} className="faq-item">
            <summary>{f.q}</summary>
            <p className="muted">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

/* ---------- Closing CTA ---------- */

export function CtaBand({ onSample }: { onSample: () => void }) {
  return (
    <section className="cta-band">
      <h2>See your data differently.</h2>
      <p className="muted">
        No sign-up, no upload, no waiting. Your first dashboard is one file
        away.
      </p>
      <div className="cta-actions">
        <button className="cta-primary" onClick={onSample}>
          Try the sample dataset
        </button>
        <a href="#top" className="cta-secondary">
          or drop your own file ↑
        </a>
      </div>
    </section>
  );
}
