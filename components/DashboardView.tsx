"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { DashboardSpec, DatasetMeta, Row } from "@/lib/types";
import { getDashboard, getDataset, saveDashboard } from "@/lib/clientStore";
import { useDarkMode } from "@/lib/useDarkMode";
import Widget from "./Widget";
import ChatPanel from "./ChatPanel";

export default function DashboardView() {
  const id = useSearchParams().get("id") ?? "";
  const [dashboard, setDashboard] = useState<DashboardSpec | null>(null);
  const [dataset, setDataset] = useState<{
    meta: DatasetMeta;
    rows: Row[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isDark = useDarkMode();

  useEffect(() => {
    const d = getDashboard(id);
    if (!d) {
      setError("Dashboard not found in this browser.");
      return;
    }
    const ds = getDataset(d.datasetId);
    if (!ds) {
      setError("The dataset for this dashboard is no longer stored.");
      return;
    }
    setDashboard(d);
    setDataset(ds);
  }, [id]);

  function handleUpdate(updated: DashboardSpec) {
    saveDashboard(updated);
    setDashboard(updated);
  }

  if (error) {
    return (
      <main className="page-center">
        <p className="error-text">{error}</p>
        <Link href="/">← Back home</Link>
      </main>
    );
  }
  if (!dashboard || !dataset) {
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
            <p className="muted">
              {dataset.meta.name} · {dataset.meta.rowCount.toLocaleString()}{" "}
              rows · {dataset.meta.columns.length} columns
            </p>
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
              meta={dataset.meta}
              rows={dataset.rows}
              isDark={isDark}
            />
          ))}
        </section>
      </main>
      <ChatPanel
        dashboard={dashboard}
        meta={dataset.meta}
        rows={dataset.rows}
        onDashboardUpdate={handleUpdate}
      />
    </div>
  );
}
