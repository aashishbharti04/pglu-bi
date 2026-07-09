"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { DashboardSpec, DatasetMeta, Row } from "@/lib/types";
import { parseFile, profileDataset } from "@/lib/parse";
import { aiEnabled, generateDashboard } from "@/lib/ai";
import { buildTemplate, TEMPLATES, type TemplateId } from "@/lib/templates";
import { parseBundle } from "@/lib/export";
import { useTheme, type ThemeMode } from "@/lib/useDarkMode";
import {
  deleteDashboard,
  getApiKey,
  listDashboards,
  saveDashboard,
  saveDataset,
  setApiKey,
} from "@/lib/clientStore";
import { newId } from "@/lib/id";

type Phase = "idle" | "parsing" | "choose" | "generating";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const THEME_LABEL: Record<ThemeMode, string> = {
  system: "◐",
  light: "☀",
  dark: "●",
};
const THEME_NEXT: Record<ThemeMode, ThemeMode> = {
  system: "light",
  light: "dark",
  dark: "system",
};

const FEATURES = [
  {
    icon: "✦",
    title: "AI-designed dashboards",
    text: "Claude reads your data's shape and builds the layout, charts, and written insights — grounded in real aggregates, not guesses.",
  },
  {
    icon: "▦",
    title: "Five pro templates",
    text: "Executive, Sales, Trends, Breakdown, Explorer. Instant, key-free, and adapted to whatever columns your file has.",
  },
  {
    icon: "◫",
    title: "13 chart types",
    text: "KPIs with sparklines, treemaps, heatmaps, funnels, stacked bars and more — a validated, colorblind-safe palette in light and dark.",
  },
  {
    icon: "⌁",
    title: "Edit by chat",
    text: "“Break revenue down by region.” “Make this a line chart.” The copilot rewrites the dashboard and answers questions about your data.",
  },
  {
    icon: "⇄",
    title: "Filter, slice, export",
    text: "Global dimension and date filters recompute everything live. Download any widget as CSV or PNG, or share a whole dashboard as one file.",
  },
  {
    icon: "⛨",
    title: "Private by design",
    text: "No server, no upload, no account. Your data lives in your browser and never leaves it — except to Anthropic if you enable AI.",
  },
];

const MOCK_BARS = [42, 68, 55, 82, 60, 92, 74, 100];

function MockDashboard() {
  return (
    <div className="mock" aria-hidden>
      <div className="mock-titlebar">
        <span className="mock-dot" />
        <span className="mock-dot" />
        <span className="mock-dot" />
        <span className="mock-title">Q4 Performance</span>
      </div>
      <div className="mock-kpis">
        <div className="mock-kpi">
          <span className="mock-kpi-label">Revenue</span>
          <span className="mock-kpi-value">$265K</span>
          <span className="mock-kpi-delta up">▲ 12.4%</span>
        </div>
        <div className="mock-kpi">
          <span className="mock-kpi-label">Orders</span>
          <span className="mock-kpi-value">2,429</span>
          <span className="mock-kpi-delta up">▲ 8.1%</span>
        </div>
        <div className="mock-kpi">
          <span className="mock-kpi-label">AOV</span>
          <span className="mock-kpi-value">$109</span>
          <span className="mock-kpi-delta down">▼ 2.3%</span>
        </div>
      </div>
      <div className="mock-bars">
        {MOCK_BARS.map((h, i) => (
          <span
            key={i}
            className="mock-bar"
            style={{ height: `${h}%`, animationDelay: `${0.25 + i * 0.07}s` }}
          />
        ))}
      </div>
      <svg className="mock-line" viewBox="0 0 300 60" preserveAspectRatio="none">
        <defs>
          <linearGradient id="mockFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M0,48 C30,44 45,30 75,32 C105,34 120,18 150,20 C180,22 195,34 225,26 C255,18 270,10 300,8 L300,60 L0,60 Z"
          fill="url(#mockFill)"
        />
        <path
          d="M0,48 C30,44 45,30 75,32 C105,34 120,18 150,20 C180,22 195,34 225,26 C255,18 270,10 300,8"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          className="mock-line-path"
        />
      </svg>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const { mode, setMode } = useTheme();
  const [phase, setPhase] = useState<Phase>("idle");
  const [pending, setPending] = useState<{
    meta: DatasetMeta;
    rows: Row[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [dashboards, setDashboards] = useState<DashboardSpec[]>([]);
  const [keyInput, setKeyInput] = useState("");
  const [keySaved, setKeySaved] = useState(false);

  useEffect(() => {
    setDashboards(listDashboards());
    setKeySaved(Boolean(getApiKey()));
  }, []);

  const handleData = useCallback(
    async (data: ArrayBuffer, filename: string) => {
      setError(null);
      setPhase("parsing");
      try {
        if (filename.endsWith(".pglu.json")) {
          const bundle = parseBundle(new TextDecoder().decode(data));
          saveDataset(bundle.dataset.meta, bundle.dataset.rows);
          saveDashboard(bundle.dashboard);
          router.push(`/dashboard?id=${bundle.dashboard.id}`);
          return;
        }
        const rows = parseFile(data, filename);
        if (rows.length === 0)
          throw new Error("The file contains no data rows");
        const datasetId = newId();
        const meta = profileDataset(datasetId, filename, rows);
        saveDataset(meta, rows);
        setPending({ meta, rows });
        setPhase("choose");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
        setPhase("idle");
      }
    },
    [router]
  );

  const create = useCallback(
    async (choice: "ai" | TemplateId) => {
      if (!pending) return;
      setPhase("generating");
      try {
        const generated =
          choice === "ai"
            ? await generateDashboard(pending.meta, pending.rows)
            : buildTemplate(choice, pending.meta, pending.rows);
        const dashboard: DashboardSpec = {
          id: newId(),
          datasetId: pending.meta.id,
          createdAt: new Date().toISOString(),
          ...generated,
        };
        saveDashboard(dashboard);
        router.push(`/dashboard?id=${dashboard.id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
        setPhase("choose");
      }
    },
    [pending, router]
  );

  const handleFile = useCallback(
    async (file: File) => handleData(await file.arrayBuffer(), file.name),
    [handleData]
  );

  const trySample = useCallback(async () => {
    const res = await fetch(`${BASE_PATH}/sample-sales.csv`);
    handleData(await res.arrayBuffer(), "sample-sales.csv");
  }, [handleData]);

  const dropzone = (
    <label
      className={`dropzone ${dragOver ? "dropzone-active" : ""} ${
        phase !== "idle" ? "dropzone-busy" : ""
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file && phase === "idle") handleFile(file);
      }}
    >
      <input
        type="file"
        accept=".csv,.tsv,.txt,.xlsx,.xls,.json"
        hidden
        disabled={phase !== "idle"}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      {phase === "idle" && (
        <>
          <span className="dropzone-icon">⤒</span>
          <span className="dropzone-title">
            Drop a file or click to browse
          </span>
          <span className="muted">
            CSV · Excel · JSON · .pglu.json bundle
          </span>
        </>
      )}
      {phase === "parsing" && (
        <span className="dropzone-title">Parsing and profiling data…</span>
      )}
      {phase === "generating" && (
        <span className="dropzone-title">Designing your dashboard…</span>
      )}
    </label>
  );

  return (
    <main className="home">
      <div className="hero-glow" aria-hidden />

      <nav className="home-nav">
        <span className="logo">
          <span className="logo-mark">◧</span> Pglu BI
        </span>
        <span className="nav-actions">
          <a
            href="https://github.com/aashishbharti04/pglu-bi"
            target="_blank"
            rel="noreferrer"
            className="nav-link"
          >
            GitHub
          </a>
          <button
            className="header-btn theme-btn"
            onClick={() => setMode(THEME_NEXT[mode])}
            title={`Theme: ${mode}`}
          >
            {THEME_LABEL[mode]}
          </button>
        </span>
      </nav>

      {phase === "choose" && pending ? (
        <section className="template-picker rise">
          <div className="template-picker-head">
            <h2>
              {pending.meta.name} · {pending.meta.rowCount.toLocaleString()}{" "}
              rows · {pending.meta.columns.length} columns
            </h2>
            <p className="muted">Choose how to build the dashboard:</p>
          </div>
          <div className="template-grid">
            <button
              className="template-card template-ai"
              onClick={() => create("ai")}
            >
              <span className="template-icon">✨</span>
              <span className="template-name">AI designed</span>
              <span className="template-desc muted">
                {aiEnabled()
                  ? "Claude picks the best layout, charts, and insights for this data."
                  : "No API key set — falls back to the Executive template."}
              </span>
            </button>
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                className="template-card"
                onClick={() => create(t.id)}
              >
                <span className="template-icon">{t.icon}</span>
                <span className="template-name">{t.name}</span>
                <span className="template-desc muted">{t.description}</span>
              </button>
            ))}
          </div>
          <button
            className="link-btn"
            onClick={() => {
              setPending(null);
              setPhase("idle");
            }}
          >
            ← Choose a different file
          </button>
          {error && <p className="error-text">{error}</p>}
        </section>
      ) : (
        <>
          <section className="hero">
            <div className="hero-left rise">
              <span className="hero-eyebrow">
                AI-native business intelligence
              </span>
              <h1>
                Raw data to <em>living dashboard</em> in seconds.
              </h1>
              <p className="hero-sub">
                Drop a spreadsheet. Pglu profiles it, designs the dashboard —
                five pro templates or Claude-crafted — then lets you reshape
                everything by chat. All in your browser, nothing uploaded.
              </p>
              {dropzone}
              <div className="hero-secondary">
                <button className="sample-btn" onClick={trySample}>
                  Try it with sample sales data →
                </button>
              </div>
              {error && <p className="error-text">{error}</p>}
            </div>
            <div className="hero-right rise rise-2">
              <MockDashboard />
            </div>
          </section>

          {dashboards.length > 0 && (
            <section className="dash-list rise rise-2">
              <h2>Your dashboards</h2>
              <ul>
                {dashboards.map((d) => (
                  <li key={d.id} className="dash-list-row">
                    <Link
                      href={`/dashboard?id=${d.id}`}
                      className="dash-list-item"
                    >
                      <span>{d.name}</span>
                      <span className="muted">
                        {d.widgets.length} widgets ·{" "}
                        {new Date(d.createdAt).toLocaleDateString()}
                      </span>
                    </Link>
                    <button
                      className="link-btn"
                      title="Delete dashboard"
                      onClick={() => {
                        deleteDashboard(d.id);
                        setDashboards(listDashboards());
                      }}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="features rise rise-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="feature-card">
                <span className="feature-icon">{f.icon}</span>
                <span className="feature-title">{f.title}</span>
                <span className="feature-text muted">{f.text}</span>
              </div>
            ))}
          </section>

          <section className="key-section rise rise-3">
            <div className="card-title">Anthropic API key</div>
            {keySaved ? (
              <p className="muted key-row">
                AI features enabled — key stored in this browser only.{" "}
                <button
                  className="link-btn"
                  onClick={() => {
                    setApiKey("");
                    setKeySaved(false);
                  }}
                >
                  Remove key
                </button>
              </p>
            ) : (
              <>
                <p className="muted">
                  Optional. Enables AI-designed dashboards, insights, and chat
                  editing. The key is stored only in your browser and sent only
                  to Anthropic.
                </p>
                <form
                  className="key-row"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (keyInput.trim()) {
                      setApiKey(keyInput);
                      setKeyInput("");
                      setKeySaved(true);
                    }
                  }}
                >
                  <input
                    type="password"
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    placeholder="sk-ant-…"
                  />
                  <button type="submit" disabled={!keyInput.trim()}>
                    Save
                  </button>
                </form>
              </>
            )}
          </section>

          <footer className="home-footer muted">
            <span>
              Built with Next.js, ECharts &amp; Claude · charts use a
              colorblind-validated palette
            </span>
            <a
              href="https://github.com/aashishbharti04/pglu-bi"
              target="_blank"
              rel="noreferrer"
            >
              Source on GitHub
            </a>
          </footer>
        </>
      )}
    </main>
  );
}
