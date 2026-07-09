"use client";

import { useMemo, useRef, useState } from "react";
import * as echarts from "echarts";
import type {
  DatasetMeta,
  Filter,
  QueryResult,
  Row,
  WidgetSpec,
  WidgetType,
} from "@/lib/types";
import { runQuery } from "@/lib/query";
import { formatValue } from "@/lib/format";
import { getTheme } from "@/lib/palette";
import { downloadBlob, resultToCsv } from "@/lib/export";
import Chart from "./Chart";
import Sparkline from "./Sparkline";

const SWITCHABLE: { type: WidgetType; label: string }[] = [
  { type: "bar", label: "Bar" },
  { type: "hbar", label: "Horizontal bar" },
  { type: "stacked-bar", label: "Stacked bar" },
  { type: "line", label: "Line" },
  { type: "area", label: "Area" },
  { type: "pie", label: "Pie" },
  { type: "donut", label: "Donut" },
  { type: "treemap", label: "Treemap" },
  { type: "heatmap", label: "Heatmap" },
  { type: "funnel", label: "Funnel" },
];

const SPANS = [
  { value: 3, label: "S" },
  { value: 4, label: "M" },
  { value: 6, label: "L" },
  { value: 8, label: "XL" },
  { value: 12, label: "Full" },
];

export default function Widget({
  widget,
  meta,
  rows,
  isDark,
  globalFilters,
  onChange,
  onDuplicate,
  onDelete,
}: {
  widget: WidgetSpec;
  meta: DatasetMeta;
  rows: Row[];
  isDark: boolean;
  globalFilters: Filter[];
  onChange: (w: WidgetSpec) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const query = useMemo(
    () => ({
      ...widget.query,
      filters: [...(widget.query.filters ?? []), ...globalFilters],
    }),
    [widget.query, globalFilters]
  );

  const { result, error } = useMemo((): {
    result: QueryResult | null;
    error: string | null;
  } => {
    try {
      return { result: runQuery(rows, meta, widget.type, query), error: null };
    } catch (e) {
      return {
        result: null,
        error: e instanceof Error ? e.message : "Query failed",
      };
    }
  }, [widget.type, query, meta, rows]);

  // KPI trend: month buckets over the trend column, same measure/agg/filters
  const trend = useMemo(() => {
    if (widget.type !== "kpi" || !widget.trendColumn) return null;
    try {
      const r = runQuery(rows, meta, "line", {
        dimension: widget.trendColumn,
        timeGrain: "month",
        measure: query.measure,
        agg: query.agg,
        filters: query.filters,
        sort: "time",
      });
      if (r.kind !== "grouped" || r.rows.length < 2) return null;
      const values = r.rows.map((x) => x.value ?? 0);
      const last = values[values.length - 1];
      const prev = values[values.length - 2];
      const delta = ((last - prev) / Math.max(Math.abs(prev), 1e-9)) * 100;
      return { values, delta };
    } catch {
      return null;
    }
  }, [widget.type, widget.trendColumn, query, meta, rows]);

  const t = getTheme(isDark);
  const canSwitchType = SWITCHABLE.some((s) => s.type === widget.type);

  function downloadCsv() {
    if (!result) return;
    downloadBlob(
      `${widget.title.replace(/[^\w.-]+/g, "_")}.csv`,
      resultToCsv(result),
      "text/csv"
    );
    setMenuOpen(false);
  }

  function downloadPng() {
    const dom = bodyRef.current?.querySelector("div");
    const chart = dom ? echarts.getInstanceByDom(dom as HTMLDivElement) : null;
    if (!chart) return;
    const url = chart.getDataURL({
      pixelRatio: 2,
      backgroundColor: t.surface,
    });
    const a = document.createElement("a");
    a.href = url;
    a.download = `${widget.title.replace(/[^\w.-]+/g, "_")}.png`;
    a.click();
    setMenuOpen(false);
  }

  const menu = (
    <div className="widget-actions">
      <button
        className="widget-menu-btn"
        aria-label="Widget options"
        onClick={() => setMenuOpen((o) => !o)}
      >
        ⋯
      </button>
      {menuOpen && (
        <>
          <div className="menu-backdrop" onClick={() => setMenuOpen(false)} />
          <div className="widget-menu">
            {canSwitchType && (
              <label>
                Chart
                <select
                  value={widget.type}
                  onChange={(e) => {
                    const type = e.target.value as WidgetType;
                    if (
                      (type === "heatmap" || type === "stacked-bar") &&
                      !widget.query.series
                    )
                      return;
                    onChange({ ...widget, type });
                  }}
                >
                  {SWITCHABLE.map((s) => (
                    <option
                      key={s.type}
                      value={s.type}
                      disabled={
                        (s.type === "heatmap" || s.type === "stacked-bar") &&
                        !widget.query.series
                      }
                    >
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              Width
              <select
                value={widget.span}
                onChange={(e) =>
                  onChange({ ...widget, span: Number(e.target.value) })
                }
              >
                {SPANS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <button onClick={downloadCsv}>Download CSV</button>
            {widget.type !== "kpi" && widget.type !== "table" && (
              <button onClick={downloadPng}>Download PNG</button>
            )}
            <button
              onClick={() => {
                onDuplicate();
                setMenuOpen(false);
              }}
            >
              Duplicate
            </button>
            <button className="danger" onClick={onDelete}>
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );

  if (widget.type === "kpi") {
    return (
      <div className="card kpi">
        <div className="widget-head">
          <div className="card-title">{widget.title}</div>
          {menu}
        </div>
        <div className="kpi-value">
          {result?.kind === "kpi" ? (
            formatValue(result.value, widget.format)
          ) : (
            <span className="error-text">—</span>
          )}
        </div>
        {trend && (
          <div className="kpi-trend">
            <Sparkline values={trend.values} color={t.series[0]} />
            <span
              className={`delta ${trend.delta >= 0 ? "delta-up" : "delta-down"}`}
              style={{ color: trend.delta >= 0 ? t.good : t.bad }}
            >
              {trend.delta >= 0 ? "▲" : "▼"} {Math.abs(trend.delta).toFixed(1)}%
              <span className="muted"> MoM</span>
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="card">
      <div className="widget-head">
        <div className="card-title">{widget.title}</div>
        {menu}
      </div>
      <div className="card-body" ref={bodyRef}>
        {error || !result ? (
          <div className="error-text">{error ?? "No data"}</div>
        ) : result.kind === "table" ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {result.columns.map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row, i) => (
                  <tr key={i}>
                    {result.columns.map((c) => (
                      <td key={c}>
                        {typeof row[c] === "number"
                          ? formatValue(row[c] as number)
                          : String(row[c] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Chart widget={widget} result={result} isDark={isDark} />
        )}
      </div>
    </div>
  );
}
