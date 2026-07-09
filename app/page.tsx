"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { DashboardSpec } from "@/lib/types";

type Phase = "idle" | "uploading" | "generating";

export default function Home() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [dashboards, setDashboards] = useState<DashboardSpec[]>([]);

  useEffect(() => {
    fetch("/api/dashboards")
      .then((r) => r.json())
      .then(setDashboards)
      .catch(() => {});
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setPhase("uploading");
      try {
        const form = new FormData();
        form.append("file", file);
        const upload = await fetch("/api/datasets", {
          method: "POST",
          body: form,
        });
        const meta = await upload.json();
        if (!upload.ok) throw new Error(meta.error ?? "Upload failed");

        setPhase("generating");
        const gen = await fetch("/api/dashboards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ datasetId: meta.id }),
        });
        const dashboard = await gen.json();
        if (!gen.ok) throw new Error(dashboard.error ?? "Generation failed");
        router.push(`/d/${dashboard.id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
        setPhase("idle");
      }
    },
    [router]
  );

  return (
    <main className="home">
      <header className="home-header">
        <h1>Pglu BI</h1>
        <p className="muted">
          Upload a data file — AI profiles it, builds a dashboard, and lets you
          refine it by chat.
        </p>
      </header>

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
            <div className="dropzone-title">Drop a file or click to browse</div>
            <div className="muted">CSV, Excel (.xlsx), or JSON</div>
          </>
        )}
        {phase === "uploading" && (
          <div className="dropzone-title">Parsing and profiling data…</div>
        )}
        {phase === "generating" && (
          <div className="dropzone-title">Designing your dashboard…</div>
        )}
      </label>

      {error && <p className="error-text">{error}</p>}

      {dashboards.length > 0 && (
        <section className="dash-list">
          <h2>Dashboards</h2>
          <ul>
            {dashboards.map((d) => (
              <li key={d.id}>
                <Link href={`/d/${d.id}`} className="dash-list-item">
                  <span>{d.name}</span>
                  <span className="muted">
                    {d.widgets.length} widgets ·{" "}
                    {new Date(d.createdAt).toLocaleDateString()}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
