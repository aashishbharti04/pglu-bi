import type {
  ColumnProfile,
  DatasetMeta,
  Row,
  WidgetSpec,
} from "./types";
import { runQuery } from "./query";
import { newId } from "./id";

export type TemplateId =
  | "executive"
  | "sales"
  | "trends"
  | "breakdown"
  | "explorer";

export interface TemplateInfo {
  id: TemplateId;
  name: string;
  icon: string;
  description: string;
}

export const TEMPLATES: TemplateInfo[] = [
  {
    id: "executive",
    name: "Executive Overview",
    icon: "◧",
    description: "Headline KPIs with trends, plus the key breakdowns.",
  },
  {
    id: "sales",
    name: "Sales Performance",
    icon: "▤",
    description: "Revenue focus: trend by segment, top performers, share.",
  },
  {
    id: "trends",
    name: "Trends & Time Series",
    icon: "∿",
    description: "Every measure over time, with a seasonality heatmap.",
  },
  {
    id: "breakdown",
    name: "Category Breakdown",
    icon: "▦",
    description: "Composition views: treemap, stacked bars, funnel.",
  },
  {
    id: "explorer",
    name: "Data Explorer",
    icon: "☰",
    description: "Column distributions, uniqueness, and a raw data table.",
  },
];

// ---------- Column selection helpers ----------

interface Shape {
  numeric: ColumnProfile[];
  categorical: ColumnProfile[];
  dates: ColumnProfile[];
  /** Best "money-like" or otherwise primary measure. */
  primary: ColumnProfile | undefined;
  dateCol: string | undefined;
}

const MONEY = /revenue|sales|amount|total|price|cost|profit|gmv|value/i;
const AVG_LIKE = /price|rate|pct|percent|ratio|score|age|rating|avg|mean/i;

function shape(meta: DatasetMeta): Shape {
  const numeric = meta.columns.filter((c) => c.type === "number");
  const categorical = meta.columns
    .filter(
      (c) => c.type === "string" && c.distinctCount > 1 && c.distinctCount <= 50
    )
    .sort((a, b) => a.distinctCount - b.distinctCount);
  const dates = meta.columns.filter((c) => c.type === "date");
  const primary =
    numeric.find((c) => MONEY.test(c.name) && !AVG_LIKE.test(c.name)) ??
    numeric.find((c) => MONEY.test(c.name)) ??
    numeric[0];
  return { numeric, categorical, dates, primary, dateCol: dates[0]?.name };
}

function aggFor(col: ColumnProfile): "sum" | "avg" {
  return AVG_LIKE.test(col.name) ? "avg" : "sum";
}

function formatFor(col: ColumnProfile): "currency" | "number" {
  return MONEY.test(col.name) ? "currency" : "number";
}

function kpi(col: ColumnProfile, dateCol?: string): WidgetSpec {
  const agg = aggFor(col);
  return {
    id: newId(),
    title: `${agg === "avg" ? "Avg" : "Total"} ${col.name}`,
    type: "kpi",
    span: 3,
    query: { measure: col.name, agg },
    format: formatFor(col),
    trendColumn: dateCol,
  };
}

function countKpi(dateCol?: string): WidgetSpec {
  return {
    id: newId(),
    title: "Records",
    type: "kpi",
    span: 3,
    query: { agg: "count" },
    format: "number",
    trendColumn: dateCol,
  };
}

// ---------- Templates ----------

function executive(s: Shape): WidgetSpec[] {
  const widgets: WidgetSpec[] = [countKpi(s.dateCol)];
  for (const col of s.numeric.slice(0, 3)) widgets.push(kpi(col, s.dateCol));
  if (s.dateCol && s.primary) {
    widgets.push({
      id: newId(),
      title: `${s.primary.name} over time`,
      type: "area",
      span: 12,
      query: {
        dimension: s.dateCol,
        timeGrain: "month",
        measure: s.primary.name,
        agg: aggFor(s.primary),
        sort: "time",
      },
      format: formatFor(s.primary),
    });
  }
  const [dimA, dimB] = s.categorical;
  if (dimA && s.primary) {
    widgets.push({
      id: newId(),
      title: `${s.primary.name} by ${dimA.name}`,
      type: dimA.distinctCount <= 6 ? "donut" : "bar",
      span: 6,
      query: {
        dimension: dimA.name,
        measure: s.primary.name,
        agg: aggFor(s.primary),
        sort: "desc",
        limit: 10,
      },
      format: formatFor(s.primary),
    });
  }
  if (dimB && s.primary) {
    widgets.push({
      id: newId(),
      title: `Top ${dimB.name} by ${s.primary.name}`,
      type: "hbar",
      span: 6,
      query: {
        dimension: dimB.name,
        measure: s.primary.name,
        agg: aggFor(s.primary),
        sort: "desc",
        limit: 8,
      },
      format: formatFor(s.primary),
    });
  }
  return widgets;
}

function sales(s: Shape): WidgetSpec[] {
  const widgets: WidgetSpec[] = [];
  if (s.primary) widgets.push(kpi(s.primary, s.dateCol));
  widgets.push(countKpi(s.dateCol));
  for (const col of s.numeric.filter((c) => c !== s.primary).slice(0, 2))
    widgets.push(kpi(col, s.dateCol));
  const [dimA, dimB] = s.categorical;
  if (s.dateCol && s.primary) {
    widgets.push({
      id: newId(),
      title: `${s.primary.name} by month${dimA ? ` and ${dimA.name}` : ""}`,
      type: dimA ? "stacked-bar" : "bar",
      span: 12,
      query: {
        dimension: s.dateCol,
        timeGrain: "month",
        measure: s.primary.name,
        agg: aggFor(s.primary),
        series: dimA?.name,
        sort: "time",
      },
      format: formatFor(s.primary),
    });
  }
  if (dimB && s.primary) {
    widgets.push({
      id: newId(),
      title: `Top ${dimB.name}`,
      type: "hbar",
      span: 6,
      query: {
        dimension: dimB.name,
        measure: s.primary.name,
        agg: aggFor(s.primary),
        sort: "desc",
        limit: 8,
      },
      format: formatFor(s.primary),
    });
  }
  if (dimA && s.primary) {
    widgets.push({
      id: newId(),
      title: `${s.primary.name} share by ${dimA.name}`,
      type: "donut",
      span: 6,
      query: {
        dimension: dimA.name,
        measure: s.primary.name,
        agg: aggFor(s.primary),
        sort: "desc",
        limit: 6,
      },
      format: formatFor(s.primary),
    });
  }
  widgets.push({
    id: newId(),
    title: "Top records",
    type: "table",
    span: 12,
    query: { measure: s.primary?.name, agg: "sum", limit: 8 },
  });
  return widgets;
}

function trends(s: Shape): WidgetSpec[] {
  const widgets: WidgetSpec[] = [];
  if (!s.dateCol) return executive(s); // no time axis — degrade gracefully
  for (const col of s.numeric.slice(0, 2)) widgets.push(kpi(col, s.dateCol));
  widgets.push(countKpi(s.dateCol));
  s.numeric.slice(0, 3).forEach((col, i) => {
    widgets.push({
      id: newId(),
      title: `${col.name} by month`,
      type: i === 0 ? "area" : "line",
      span: i === 0 ? 12 : 6,
      query: {
        dimension: s.dateCol,
        timeGrain: "month",
        measure: col.name,
        agg: aggFor(col),
        sort: "time",
      },
      format: formatFor(col),
    });
  });
  const dim = s.categorical[0];
  if (dim && s.primary) {
    widgets.push({
      id: newId(),
      title: `${s.primary.name} heatmap — month × ${dim.name}`,
      type: "heatmap",
      span: 12,
      query: {
        dimension: s.dateCol,
        timeGrain: "month",
        measure: s.primary.name,
        agg: aggFor(s.primary),
        series: dim.name,
        sort: "time",
      },
      format: formatFor(s.primary),
    });
  }
  return widgets;
}

function breakdown(s: Shape): WidgetSpec[] {
  const widgets: WidgetSpec[] = [];
  const [dimA, dimB, dimC] = s.categorical;
  if (s.primary) widgets.push(kpi(s.primary, s.dateCol));
  widgets.push(countKpi(s.dateCol));
  if (dimB && s.primary) {
    widgets.push({
      id: newId(),
      title: `${s.primary.name} treemap by ${dimB.name}`,
      type: "treemap",
      span: 6,
      query: {
        dimension: dimB.name,
        measure: s.primary.name,
        agg: aggFor(s.primary),
        sort: "desc",
        limit: 12,
      },
      format: formatFor(s.primary),
    });
  }
  if (dimA && dimB && s.primary) {
    widgets.push({
      id: newId(),
      title: `${dimB.name} composition by ${dimA.name}`,
      type: "stacked-bar",
      span: 6,
      query: {
        dimension: dimB.name,
        measure: s.primary.name,
        agg: aggFor(s.primary),
        series: dimA.name,
        sort: "desc",
        limit: 8,
      },
      format: formatFor(s.primary),
    });
  }
  if (dimC && s.primary) {
    widgets.push({
      id: newId(),
      title: `${s.primary.name} funnel by ${dimC.name}`,
      type: "funnel",
      span: 6,
      query: {
        dimension: dimC.name,
        measure: s.primary.name,
        agg: aggFor(s.primary),
        sort: "desc",
        limit: 6,
      },
      format: formatFor(s.primary),
    });
  }
  if (dimA && s.primary) {
    widgets.push({
      id: newId(),
      title: `${s.primary.name} share by ${dimA.name}`,
      type: "donut",
      span: 6,
      query: {
        dimension: dimA.name,
        measure: s.primary.name,
        agg: aggFor(s.primary),
        sort: "desc",
        limit: 6,
      },
      format: formatFor(s.primary),
    });
  }
  return widgets;
}

function explorer(s: Shape, meta: DatasetMeta): WidgetSpec[] {
  const widgets: WidgetSpec[] = [countKpi(s.dateCol)];
  for (const dim of s.categorical.slice(0, 2)) {
    widgets.push({
      id: newId(),
      title: `Unique ${dim.name}`,
      type: "kpi",
      span: 3,
      query: { dimension: dim.name, agg: "distinct" },
      format: "number",
    });
  }
  if (s.numeric[0]) widgets.push(kpi(s.numeric[0], s.dateCol));
  for (const dim of s.categorical.slice(0, 3)) {
    widgets.push({
      id: newId(),
      title: `Rows by ${dim.name}`,
      type: dim.distinctCount > 8 ? "hbar" : "bar",
      span: 4,
      query: { dimension: dim.name, agg: "count", sort: "desc", limit: 10 },
      format: "number",
    });
  }
  const [m1, m2] = s.numeric;
  if (m1 && m2) {
    widgets.push({
      id: newId(),
      title: `${m1.name} vs ${m2.name}`,
      type: "scatter",
      span: 6,
      query: {
        measure: m1.name,
        measure2: m2.name,
        agg: "sum",
        dimension: s.categorical[0]?.name,
      },
    });
  }
  widgets.push({
    id: newId(),
    title: `Raw data (${meta.rowCount.toLocaleString()} rows)`,
    type: "table",
    span: m1 && m2 ? 6 : 12,
    query: { agg: "count", limit: 10 },
  });
  return widgets;
}

// ---------- Computed insights ----------

function templateInsights(meta: DatasetMeta, rows: Row[], s: Shape): string[] {
  const out: string[] = [];
  if (s.primary && s.categorical[0]) {
    const r = runQuery(rows, meta, "bar", {
      dimension: s.categorical[0].name,
      measure: s.primary.name,
      agg: aggFor(s.primary),
      sort: "desc",
      limit: 3,
    });
    if (r.kind === "grouped" && r.rows.length >= 2) {
      const [top, second] = r.rows;
      out.push(
        `${top.key} leads ${s.categorical[0].name} with ${Math.round(
          top.value ?? 0
        ).toLocaleString()} ${s.primary.name} — ${(
          ((top.value ?? 0) / Math.max(second.value ?? 1, 1)) *
          100 -
          100
        ).toFixed(0)}% ahead of ${second.key}.`
      );
    }
  }
  if (s.dateCol && s.primary) {
    const r = runQuery(rows, meta, "line", {
      dimension: s.dateCol,
      timeGrain: "month",
      measure: s.primary.name,
      agg: aggFor(s.primary),
      sort: "time",
    });
    if (r.kind === "grouped" && r.rows.length >= 2) {
      const last = r.rows[r.rows.length - 1];
      const prev = r.rows[r.rows.length - 2];
      const delta =
        (((last.value ?? 0) - (prev.value ?? 0)) /
          Math.max(Math.abs(prev.value ?? 1), 1)) *
        100;
      out.push(
        `${s.primary.name} ${delta >= 0 ? "grew" : "fell"} ${Math.abs(
          delta
        ).toFixed(0)}% in ${last.key} vs ${prev.key}.`
      );
    }
  }
  out.push(
    `${meta.rowCount.toLocaleString()} rows across ${meta.columns.length} columns.`
  );
  return out;
}

// ---------- Public API ----------

export function buildTemplate(
  id: TemplateId,
  meta: DatasetMeta,
  rows: Row[]
): { name: string; widgets: WidgetSpec[]; insights: string[] } {
  const s = shape(meta);
  const builders: Record<TemplateId, () => WidgetSpec[]> = {
    executive: () => executive(s),
    sales: () => sales(s),
    trends: () => trends(s),
    breakdown: () => breakdown(s),
    explorer: () => explorer(s, meta),
  };
  const widgets = builders[id]().filter(Boolean);
  const baseName = meta.name.replace(/\.[^.]+$/, "");
  const template = TEMPLATES.find((t) => t.id === id)!;
  return {
    name: `${baseName} — ${template.name}`,
    widgets,
    insights: templateInsights(meta, rows, s),
  };
}
