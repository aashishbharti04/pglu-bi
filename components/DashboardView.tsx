"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { DashboardSpec, DatasetMeta } from "@/lib/types";
import { useDarkMode } from "@/lib/useDarkMode";
import Widget from "./Widget";
import ChatPanel from "./ChatPanel";

export default function DashboardView({ id }: { id: string }) {
  const [dashboard, setDashboard] = useState<DashboardSpec | null>(null);
  const [dataset, setDataset] = useState<DatasetMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isDark = useDarkMode();

  useEffect(() => {
    fetch(`/api/dashboards/${id}`)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? "Not found");
        return r.json();
      })
      .then((data) => {
        setDashboard(data.dashboard);
        setDataset(data.dataset);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) {
    return (
      <main className="page-center">
        <p className="error-text">{error}</p>
        <Link href="/">← Back home</Link>
      </main>
    );
  }
  if (!dashboard) {
    return (
      <main className="page-center">
        <p className="muted">Loading dashboard…</p>
      </main>
    );
  }

  return (
    <div className="dash-layout">
      <main className="dash-main">
        <header className="dash-header">
          <div>
            <Link href="/" className="back-link">
              ← Pglu BI
            </Link>
            <h1>{dashboard.name}</h1>
            {dataset && (
              <p className="muted">
                {dataset.name} · {dataset.rowCount.toLocaleString()} rows ·{" "}
                {dataset.columns.length} columns
              </p>
            )}
          </div>
        </header>

        {dashboard.insights.length > 0 && (
          <section className="insights card">
            <div className="card-title">Insights</div>
            <ul>
              {dashboard.insights.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </section>
        )}

        <section className="widget-grid">
          {dashboard.widgets.map((w) => (
            <Widget
              key={w.id}
              widget={w}
              datasetId={dashboard.datasetId}
              isDark={isDark}
            />
          ))}
        </section>
      </main>
      <ChatPanel dashboardId={dashboard.id} onDashboardUpdate={setDashboard} />
    </div>
  );
}
