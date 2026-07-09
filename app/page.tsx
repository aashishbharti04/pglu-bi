"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { DashboardSpec, DatasetMeta, Row } from "@/lib/types";
import { parseFile, profileDataset } from "@/lib/parse";
import { aiEnabled, generateDashboard } from "@/lib/ai";
import { buildTemplate, TEMPLATES, type TemplateId } from "@/lib/templates";
import { parseBundle } from "@/lib/export";
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

export default function Home() {
  const router = useRouter();
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
          // Shared dashboard bundle — restore it directly
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

  return (
    <main className="home">
      <header className="home-header">
        <h1>Pglu BI</h1>
        <p className="muted">
          Upload a data file — pick a template or let AI design the dashboard,
          then refine it by chat. Everything stays in your browser.
        </p>
      </header>

      {phase === "choose" && pending ? (
        <section className="template-picker">
          <div className="template-picker-head">
            <h2>
              {pending.meta.name} ·{" "}
              {pending.meta.rowCount.toLocaleString()} rows
            </h2>
            <p className="muted">Choose how to build the dashboard:</p>
          </div>
          <div className="template-grid">
            <button className="template-card template-ai" onClick={() => create("ai")}>
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
        </section>
      ) : (
        <>
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
                <div className="dropzone-title">
                  Drop a file or click to browse
                </div>
                <div className="muted">
                  CSV, Excel (.xlsx), JSON, or an exported .pglu.json bundle
                </div>
              </>
            )}
            {phase === "parsing" && (
              <div className="dropzone-title">Parsing and profiling data…</div>
            )}
            {phase === "generating" && (
              <div className="dropzone-title">Designing your dashboard…</div>
            )}
          </label>

          {phase === "idle" && (
            <button className="sample-btn" onClick={trySample}>
              Or try it with sample sales data →
            </button>
          )}
        </>
      )}

      {error && <p className="error-text">{error}</p>}

      <section className="key-section">
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
              editing. The key is stored only in your browser and sent only to
              Anthropic.
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

      {dashboards.length > 0 && (
        <section className="dash-list">
          <h2>Dashboards</h2>
          <ul>
            {dashboards.map((d) => (
              <li key={d.id} className="dash-list-row">
                <Link href={`/dashboard?id=${d.id}`} className="dash-list-item">
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
    </main>
  );
}
