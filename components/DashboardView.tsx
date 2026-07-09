"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type {
  DashboardSpec,
  DatasetMeta,
  Filter,
  Row,
  WidgetSpec,
} from "@/lib/types";
import { getDashboard, getDataset, saveDashboard } from "@/lib/clientStore";
import { useTheme, type ThemeMode } from "@/lib/useDarkMode";
import { buildTemplate, TEMPLATES, type TemplateId } from "@/lib/templates";
import { aiEnabled, generateDashboard } from "@/lib/ai";
import { exportBundle } from "@/lib/export";
import { newId } from "@/lib/id";
import Widget from "./Widget";
import ChatPanel from "./ChatPanel";
import FilterBar, { EMPTY_FILTERS, type FilterState } from "./FilterBar";

const THEME_LABEL: Record<ThemeMode, string> = {
  system: "◐ Auto",
  light: "☀ Light",
  dark: "● Dark",
};
const THEME_NEXT: Record<ThemeMode, ThemeMode> = {
  system: "light",
  light: "dark",
  dark: "system",
};

export default function DashboardView() {
  const id = useSearchParams().get("id") ?? "";
  const [dashboard, setDashboard] = useState<DashboardSpec | null>(null);
  const [dataset, setDataset] = useState<{
    meta: DatasetMeta;
    rows: Row[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [switching, setSwitching] = useState(false);
  const { isDark, mode, setMode } = useTheme();

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

  const globalFilters = useMemo((): Filter[] => {
    if (!dataset) return [];
    const out: Filter[] = [];
    for (const [column, value] of Object.entries(filters.dims)) {
      if (value) out.push({ column, op: "eq", value });
    }
    const dateCol = dataset.meta.columns.find((c) => c.type === "date");
    if (dateCol) {
      if (filters.from)
        out.push({ column: dateCol.name, op: "gte", value: filters.from });
      if (filters.to)
        out.push({ column: dateCol.name, op: "lte", value: filters.to });
    }
    return out;
  }, [filters, dataset]);

  function update(updated: DashboardSpec) {
    saveDashboard(updated);
    setDashboard(updated);
  }

  function patchWidget(w: WidgetSpec) {
    if (!dashboard) return;
    update({
      ...dashboard,
      widgets: dashboard.widgets.map((x) => (x.id === w.id ? w : x)),
    });
  }

  function duplicateWidget(w: WidgetSpec) {
    if (!dashboard) return;
    const idx = dashboard.widgets.findIndex((x) => x.id === w.id);
    const copy = { ...w, id: newId(), title: `${w.title} (copy)` };
    const widgets = [...dashboard.widgets];
    widgets.splice(idx + 1, 0, copy);
    update({ ...dashboard, widgets });
  }

  function deleteWidget(w: WidgetSpec) {
    if (!dashboard) return;
    update({
      ...dashboard,
      widgets: dashboard.widgets.filter((x) => x.id !== w.id),
    });
  }

  function reorder(from: number, to: number) {
    if (!dashboard || from === to) return;
    const widgets = [...dashboard.widgets];
    const [moved] = widgets.splice(from, 1);
    widgets.splice(to, 0, moved);
    update({ ...dashboard, widgets });
  }

  async function applyTemplate(value: string) {
    if (!dashboard || !dataset || !value) return;
    setSwitching(true);
    try {
      if (value === "ai") {
        const generated = await generateDashboard(dataset.meta, dataset.rows);
        update({ ...dashboard, ...generated });
      } else {
        const built = buildTemplate(
          value as TemplateId,
          dataset.meta,
          dataset.rows
        );
        update({ ...dashboard, widgets: built.widgets, insights: built.insights });
      }
    } finally {
      setSwitching(false);
    }
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
          <div className="header-actions">
            <select
              className="header-select"
              value=""
              disabled={switching}
              onChange={(e) => applyTemplate(e.target.value)}
              title="Rebuild this dashboard from a template"
            >
              <option value="">
                {switching ? "Building…" : "⊞ Template"}
              </option>
              {aiEnabled() && <option value="ai">✨ AI redesign</option>}
              {TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.icon} {t.name}
                </option>
              ))}
            </select>
            <button
              className="header-btn"
              onClick={() => exportBundle(dashboard, dataset)}
              title="Download dashboard + data as a shareable file"
            >
              ⤓ Export
            </button>
            <button
              className="header-btn"
              onClick={() => setMode(THEME_NEXT[mode])}
              title="Theme"
            >
              {THEME_LABEL[mode]}
            </button>
          </div>
        </header>

        <FilterBar
          meta={dataset.meta}
          rows={dataset.rows}
          value={filters}
          onChange={setFilters}
        />

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
          {dashboard.widgets.map((w, i) => (
            <div
              key={w.id}
              className={`widget-wrap widget-span-${w.span} ${
                dragIndex === i ? "dragging" : ""
              }`}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragEnd={() => setDragIndex(null)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragIndex !== null) reorder(dragIndex, i);
                setDragIndex(null);
              }}
            >
              <Widget
                widget={w}
                meta={dataset.meta}
                rows={dataset.rows}
                isDark={isDark}
                globalFilters={globalFilters}
                onChange={patchWidget}
                onDuplicate={() => duplicateWidget(w)}
                onDelete={() => deleteWidget(w)}
              />
            </div>
          ))}
        </section>
      </main>
      <ChatPanel
        dashboard={dashboard}
        meta={dataset.meta}
        rows={dataset.rows}
        onDashboardUpdate={update}
      />
    </div>
  );
}
