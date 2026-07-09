export type ColumnType = "number" | "string" | "date" | "boolean";

export interface ColumnProfile {
  name: string;
  type: ColumnType;
  distinctCount: number;
  nullCount: number;
  sampleValues: (string | number | boolean | null)[];
  min?: number;
  max?: number;
  mean?: number;
  sum?: number;
  minDate?: string;
  maxDate?: string;
}

export interface DatasetMeta {
  id: string;
  name: string;
  rowCount: number;
  columns: ColumnProfile[];
  createdAt: string;
}

export type Row = Record<string, string | number | boolean | null>;

export type Agg = "sum" | "avg" | "count" | "min" | "max" | "distinct";
export type TimeGrain = "day" | "week" | "month" | "quarter" | "year";

export interface Filter {
  column: string;
  op: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "contains" | "in";
  value: string | number | (string | number)[];
}

export interface QuerySpec {
  /** Group-by column (categorical or date). Omit for KPI totals. */
  dimension?: string;
  /** Bucketing when dimension is a date column. */
  timeGrain?: TimeGrain;
  /** Numeric column to aggregate. Omit when agg is "count". */
  measure?: string;
  /** Second measure — x axis for scatter. */
  measure2?: string;
  agg: Agg;
  /** Secondary group-by producing one series per value. */
  series?: string;
  filters?: Filter[];
  sort?: "asc" | "desc" | "alpha" | "time";
  limit?: number;
}

export type WidgetType =
  | "kpi"
  | "bar"
  | "line"
  | "area"
  | "pie"
  | "donut"
  | "scatter"
  | "table";

export interface WidgetSpec {
  id: string;
  title: string;
  type: WidgetType;
  query: QuerySpec;
  /** Grid width out of 12 columns. */
  span: number;
  format?: "number" | "currency" | "percent";
}

export interface DashboardSpec {
  id: string;
  name: string;
  datasetId: string;
  createdAt: string;
  widgets: WidgetSpec[];
  insights: string[];
}

export interface QueryResultRow {
  key?: string;
  series?: string;
  value?: number;
  x?: number;
  y?: number;
}

export type QueryResult =
  | { kind: "grouped"; rows: QueryResultRow[] }
  | { kind: "kpi"; value: number }
  | { kind: "scatter"; points: { x: number; y: number; key?: string }[] }
  | { kind: "table"; columns: string[]; rows: Row[] };

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}
