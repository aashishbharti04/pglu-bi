import type {
  Agg,
  DatasetMeta,
  Filter,
  QueryResult,
  QuerySpec,
  Row,
  TimeGrain,
  WidgetType,
} from "./types";

/** Ordered comparison that works for numbers and date strings alike. */
function compare(v: unknown, target: unknown): number | null {
  const a = Number(v);
  const b = Number(target);
  if (Number.isFinite(a) && Number.isFinite(b)) return a - b;
  const da = Date.parse(String(v));
  const db = Date.parse(String(target));
  if (!Number.isNaN(da) && !Number.isNaN(db)) return da - db;
  return null;
}

function applyFilters(rows: Row[], filters?: Filter[]): Row[] {
  if (!filters || filters.length === 0) return rows;
  return rows.filter((row) =>
    filters.every((f) => {
      const v = row[f.column];
      if (v === null || v === undefined) return false;
      const c = () => compare(v, f.value as string | number);
      switch (f.op) {
        case "eq":
          return String(v) === String(f.value);
        case "neq":
          return String(v) !== String(f.value);
        case "gt":
          return (c() ?? -1) > 0;
        case "gte":
          return (c() ?? -1) >= 0;
        case "lt":
          return (c() ?? 1) < 0;
        case "lte":
          return (c() ?? 1) <= 0;
        case "contains":
          return String(v).toLowerCase().includes(String(f.value).toLowerCase());
        case "in":
          return (
            Array.isArray(f.value) &&
            f.value.map(String).includes(String(v))
          );
        default:
          return true;
      }
    })
  );
}

function bucketDate(raw: unknown, grain: TimeGrain): string | null {
  const s = String(raw);
  const d = new Date(s.length === 7 ? s + "-01" : s);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  switch (grain) {
    case "year":
      return String(y);
    case "quarter":
      return `${y}-Q${Math.floor(d.getUTCMonth() / 3) + 1}`;
    case "month":
      return `${y}-${m}`;
    case "week": {
      // Snap to Monday of the week
      const monday = new Date(d);
      const dow = (d.getUTCDay() + 6) % 7;
      monday.setUTCDate(d.getUTCDate() - dow);
      return monday.toISOString().slice(0, 10);
    }
    case "day":
    default:
      return `${y}-${m}-${day}`;
  }
}

function aggregate(values: number[], agg: Agg, rowCount: number): number {
  switch (agg) {
    case "count":
      return rowCount;
    case "sum":
      return values.reduce((a, b) => a + b, 0);
    case "avg":
      return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    case "min":
      return values.length ? Math.min(...values) : 0;
    case "max":
      return values.length ? Math.max(...values) : 0;
    case "distinct":
      return new Set(values.map(String)).size;
    default:
      return 0;
  }
}

function numericValues(rows: Row[], column?: string): number[] {
  if (!column) return [];
  return rows
    .map((r) => r[column])
    .filter((v) => v !== null && v !== undefined && v !== "")
    .map(Number)
    .filter((n) => Number.isFinite(n));
}

export function runQuery(
  rows: Row[],
  meta: DatasetMeta,
  widgetType: WidgetType,
  query: QuerySpec
): QueryResult {
  const filtered = applyFilters(rows, query.filters);

  if (widgetType === "kpi") {
    const vals =
      query.agg === "distinct" && query.dimension
        ? numericValuesAsStrings(filtered, query.dimension)
        : numericValues(filtered, query.measure);
    const value =
      query.agg === "distinct" && query.dimension
        ? new Set(filtered.map((r) => String(r[query.dimension!]))).size
        : aggregate(vals, query.agg, filtered.length);
    return { kind: "kpi", value };
  }

  if (widgetType === "scatter") {
    const xCol = query.measure2;
    const yCol = query.measure;
    if (!xCol || !yCol) return { kind: "scatter", points: [] };
    const points = filtered
      .filter(
        (r) =>
          Number.isFinite(Number(r[xCol])) && Number.isFinite(Number(r[yCol]))
      )
      .slice(0, 1000)
      .map((r) => ({
        x: Number(r[xCol]),
        y: Number(r[yCol]),
        key: query.dimension ? String(r[query.dimension]) : undefined,
      }));
    return { kind: "scatter", points };
  }

  if (widgetType === "table") {
    let out = filtered;
    if (query.measure) {
      out = [...out].sort(
        (a, b) => Number(b[query.measure!]) - Number(a[query.measure!])
      );
    }
    const limit = query.limit ?? 10;
    const columns = meta.columns.map((c) => c.name);
    return { kind: "table", columns, rows: out.slice(0, limit) };
  }

  // Grouped: bar / line / area / pie / donut
  const dim = query.dimension;
  if (!dim) {
    const value = aggregate(
      numericValues(filtered, query.measure),
      query.agg,
      filtered.length
    );
    return { kind: "grouped", rows: [{ key: "Total", value }] };
  }

  const dimCol = meta.columns.find((c) => c.name === dim);
  const isDate = dimCol?.type === "date";
  const grain = query.timeGrain ?? "month";

  const keyOf = (row: Row): string | null => {
    const raw = row[dim];
    if (raw === null || raw === undefined || raw === "") return null;
    return isDate ? bucketDate(raw, grain) : String(raw);
  };

  // group: key -> series -> rows
  const groups = new Map<string, Map<string, Row[]>>();
  for (const row of filtered) {
    const key = keyOf(row);
    if (key === null) continue;
    const seriesKey = query.series ? String(row[query.series] ?? "—") : "";
    if (!groups.has(key)) groups.set(key, new Map());
    const seriesMap = groups.get(key)!;
    if (!seriesMap.has(seriesKey)) seriesMap.set(seriesKey, []);
    seriesMap.get(seriesKey)!.push(row);
  }

  let entries = [...groups.entries()].map(([key, seriesMap]) => {
    const total = aggregate(
      numericValues([...seriesMap.values()].flat(), query.measure),
      query.agg,
      [...seriesMap.values()].flat().length
    );
    return { key, seriesMap, total };
  });

  const sort =
    query.sort ?? (isDate || widgetType === "line" || widgetType === "area" ? "time" : "desc");
  if (sort === "time" || sort === "alpha") {
    entries.sort((a, b) => a.key.localeCompare(b.key));
  } else if (sort === "asc") {
    entries.sort((a, b) => a.total - b.total);
  } else {
    entries.sort((a, b) => b.total - a.total);
  }

  const limit = query.limit ?? (isDate ? 366 : 12);
  entries = entries.slice(0, limit);
  if (sort === "desc" && isDate) {
    entries.sort((a, b) => a.key.localeCompare(b.key));
  }

  const resultRows = entries.flatMap((e) => {
    if (!query.series) {
      return [{ key: e.key, value: e.total }];
    }
    return [...e.seriesMap.entries()].map(([seriesKey, rowsInGroup]) => ({
      key: e.key,
      series: seriesKey,
      value: aggregate(
        numericValues(rowsInGroup, query.measure),
        query.agg,
        rowsInGroup.length
      ),
    }));
  });

  return { kind: "grouped", rows: resultRows };
}

function numericValuesAsStrings(rows: Row[], column: string): number[] {
  return rows.map((r) => Number(r[column])).filter(Number.isFinite);
}
