"use client";

import type {
  DashboardSpec,
  DatasetMeta,
  QueryResult,
  Row,
} from "./types";

export function downloadBlob(
  filename: string,
  content: string | Blob,
  type = "application/octet-stream"
) {
  const blob =
    content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function csvEscape(v: unknown): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function resultToCsv(result: QueryResult): string {
  if (result.kind === "kpi") return `value\n${result.value}`;
  if (result.kind === "scatter") {
    return [
      "x,y,label",
      ...result.points.map((p) => [p.x, p.y, csvEscape(p.key)].join(",")),
    ].join("\n");
  }
  if (result.kind === "table") {
    return [
      result.columns.map(csvEscape).join(","),
      ...result.rows.map((r) =>
        result.columns.map((c) => csvEscape(r[c])).join(",")
      ),
    ].join("\n");
  }
  const hasSeries = result.rows.some((r) => r.series !== undefined);
  return [
    hasSeries ? "key,series,value" : "key,value",
    ...result.rows.map((r) =>
      hasSeries
        ? [csvEscape(r.key), csvEscape(r.series), r.value].join(",")
        : [csvEscape(r.key), r.value].join(",")
    ),
  ].join("\n");
}

export interface Bundle {
  kind: "pglu-bi-bundle";
  version: 1;
  dashboard: DashboardSpec;
  dataset: { meta: DatasetMeta; rows: Row[] };
}

export function exportBundle(
  dashboard: DashboardSpec,
  dataset: { meta: DatasetMeta; rows: Row[] }
) {
  const bundle: Bundle = { kind: "pglu-bi-bundle", version: 1, dashboard, dataset };
  downloadBlob(
    `${dashboard.name.replace(/[^\w.-]+/g, "_")}.pglu.json`,
    JSON.stringify(bundle),
    "application/json"
  );
}

export function parseBundle(text: string): Bundle {
  const data = JSON.parse(text);
  if (
    data?.kind !== "pglu-bi-bundle" ||
    !data.dashboard?.widgets ||
    !data.dataset?.meta ||
    !Array.isArray(data.dataset?.rows)
  ) {
    throw new Error("Not a valid Pglu BI export file");
  }
  return data as Bundle;
}
