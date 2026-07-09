import Anthropic from "@anthropic-ai/sdk";
import type {
  DashboardSpec,
  DatasetMeta,
  Row,
  WidgetSpec,
  WidgetType,
} from "./types";
import { runQuery } from "./query";
import { newId } from "./store";

const MODEL = "claude-opus-4-8";

export function aiEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function getClient(): Anthropic | null {
  if (!aiEnabled()) return null;
  return new Anthropic();
}

// ---------- Structured output schemas ----------

const QUERY_SCHEMA = {
  type: "object",
  properties: {
    dimension: { type: "string" },
    timeGrain: { type: "string", enum: ["day", "week", "month", "quarter", "year"] },
    measure: { type: "string" },
    measure2: { type: "string" },
    agg: { type: "string", enum: ["sum", "avg", "count", "min", "max", "distinct"] },
    series: { type: "string" },
    sort: { type: "string", enum: ["asc", "desc", "alpha", "time"] },
    limit: { type: "integer" },
  },
  required: ["agg"],
  additionalProperties: false,
};

const WIDGET_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    type: {
      type: "string",
      enum: ["kpi", "bar", "line", "area", "pie", "donut", "scatter", "table"],
    },
    span: { type: "integer", enum: [3, 4, 6, 8, 12] },
    format: { type: "string", enum: ["number", "currency", "percent"] },
    query: QUERY_SCHEMA,
  },
  required: ["title", "type", "span", "query"],
  additionalProperties: false,
};

const DASHBOARD_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string" },
    widgets: { type: "array", items: WIDGET_SCHEMA },
    insights: { type: "array", items: { type: "string" } },
  },
  required: ["name", "widgets", "insights"],
  additionalProperties: false,
};

const CHAT_SCHEMA = {
  type: "object",
  properties: {
    reply: {
      type: "string",
      description:
        "A short conversational reply to the user describing what was changed or answering their question.",
    },
    name: { type: "string" },
    widgets: { type: "array", items: WIDGET_SCHEMA },
    insights: { type: "array", items: { type: "string" } },
  },
  required: ["reply", "name", "widgets", "insights"],
  additionalProperties: false,
};

// ---------- Prompt context ----------

/**
 * Precompute real aggregates so the model writes insights grounded in
 * actual numbers instead of guessing from samples.
 */
function computeContext(meta: DatasetMeta, rows: Row[]): string {
  const numeric = meta.columns.filter((c) => c.type === "number");
  const categorical = meta.columns.filter(
    (c) => c.type === "string" && c.distinctCount > 1 && c.distinctCount <= 25
  );
  const dates = meta.columns.filter((c) => c.type === "date");
  const lines: string[] = [];

  const primary = numeric[0];
  for (const dim of categorical.slice(0, 3)) {
    if (!primary) break;
    const result = runQuery(rows, meta, "bar", {
      dimension: dim.name,
      measure: primary.name,
      agg: "sum",
      sort: "desc",
      limit: 8,
    });
    if (result.kind === "grouped") {
      lines.push(
        `sum(${primary.name}) by ${dim.name}: ` +
          result.rows.map((r) => `${r.key}=${Math.round(r.value ?? 0)}`).join(", ")
      );
    }
  }
  if (dates[0] && primary) {
    const result = runQuery(rows, meta, "line", {
      dimension: dates[0].name,
      timeGrain: "month",
      measure: primary.name,
      agg: "sum",
      sort: "time",
    });
    if (result.kind === "grouped") {
      lines.push(
        `sum(${primary.name}) by month: ` +
          result.rows.map((r) => `${r.key}=${Math.round(r.value ?? 0)}`).join(", ")
      );
    }
  }
  return lines.join("\n");
}

function datasetPrompt(meta: DatasetMeta, rows: Row[]): string {
  return [
    `Dataset: "${meta.name}" — ${meta.rowCount} rows.`,
    ``,
    `Column profiles (name, type, distinct count, stats, sample values):`,
    JSON.stringify(meta.columns, null, 1),
    ``,
    `First 5 rows:`,
    JSON.stringify(rows.slice(0, 5), null, 1),
    ``,
    `Precomputed aggregates (use these real numbers for insights):`,
    computeContext(meta, rows) || "(none)",
  ].join("\n");
}

const DESIGN_RULES = `
Widget design rules:
- The grid is 12 columns wide. KPI cards use span 3; charts use span 6; a primary hero chart may use span 12; tables use span 6 or 12.
- Start with 3-4 KPI cards for the headline totals, then 3-5 charts.
- Use "line" or "area" over a date dimension for change over time (set timeGrain, usually "month").
- Use "bar" for comparing categories (sorted desc, limit to the top 8-12).
- Use "pie"/"donut" only when a dimension has 6 or fewer meaningful values and parts-of-a-whole is the point.
- Use "scatter" only when two numeric measures plausibly correlate (measure = y axis, measure2 = x axis).
- Only reference column names that exist in the dataset, exactly as spelled.
- "measure" must be a numeric column; "dimension" and "series" must be string or date columns.
- Use agg "count" (no measure) for row counts, "distinct" with a dimension for unique counts.
- Set format "currency" for money-like columns, otherwise "number".
- Insights must be 3-5 short bullets citing real numbers from the precomputed aggregates — concrete findings, not descriptions of the dashboard.
`;

// ---------- Validation ----------

function sanitizeWidgets(
  raw: Omit<WidgetSpec, "id">[],
  meta: DatasetMeta
): WidgetSpec[] {
  const colTypes = new Map(meta.columns.map((c) => [c.name, c.type]));
  const valid: WidgetSpec[] = [];
  for (const w of raw) {
    const q = w.query;
    if (!q) continue;
    // Column references must exist
    const refs = [q.dimension, q.measure, q.measure2, q.series].filter(
      (c): c is string => Boolean(c)
    );
    if (refs.some((c) => !colTypes.has(c))) continue;
    // Measures must be numeric
    if (q.measure && colTypes.get(q.measure) !== "number") continue;
    if (q.measure2 && colTypes.get(q.measure2) !== "number") continue;
    // Aggregations other than count/distinct need a measure
    if (!q.measure && !["count", "distinct"].includes(q.agg)) continue;
    const span = [3, 4, 6, 8, 12].includes(w.span) ? w.span : 6;
    valid.push({ ...w, span, id: newId() });
  }
  return valid;
}

// ---------- Heuristic fallback (no API key) ----------

export function heuristicDashboard(meta: DatasetMeta): {
  name: string;
  widgets: WidgetSpec[];
  insights: string[];
} {
  const numeric = meta.columns.filter((c) => c.type === "number");
  const categorical = meta.columns.filter(
    (c) => c.type === "string" && c.distinctCount > 1 && c.distinctCount <= 50
  );
  const dates = meta.columns.filter((c) => c.type === "date");
  const widgets: WidgetSpec[] = [];

  widgets.push({
    id: newId(),
    title: "Total rows",
    type: "kpi",
    span: 3,
    query: { agg: "count" },
    format: "number",
  });
  for (const col of numeric.slice(0, 3)) {
    widgets.push({
      id: newId(),
      title: `Total ${col.name}`,
      type: "kpi",
      span: 3,
      query: { measure: col.name, agg: "sum" },
      format: "number",
    });
  }
  const primary = numeric[0];
  if (dates[0] && primary) {
    widgets.push({
      id: newId(),
      title: `${primary.name} over time`,
      type: "line",
      span: 12,
      query: {
        dimension: dates[0].name,
        timeGrain: "month",
        measure: primary.name,
        agg: "sum",
        sort: "time",
      },
    });
  }
  for (const dim of categorical.slice(0, 2)) {
    if (!primary) break;
    widgets.push({
      id: newId(),
      title: `${primary.name} by ${dim.name}`,
      type: dim.distinctCount <= 6 ? "donut" : "bar",
      span: 6,
      query: {
        dimension: dim.name,
        measure: primary.name,
        agg: "sum",
        sort: "desc",
        limit: 10,
      },
    });
  }
  return {
    name: meta.name.replace(/\.[^.]+$/, ""),
    widgets,
    insights: [
      `Loaded ${meta.rowCount.toLocaleString()} rows with ${meta.columns.length} columns.`,
      "Add ANTHROPIC_API_KEY to .env.local to enable AI-generated dashboards, insights, and chat editing.",
    ],
  };
}

// ---------- AI calls ----------

async function callStructured(
  system: string,
  user: string,
  schema: Record<string, unknown>
): Promise<Record<string, unknown> | null> {
  const client = getClient();
  if (!client) return null;
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    system,
    output_config: { format: { type: "json_schema", schema } },
    messages: [{ role: "user", content: user }],
  });
  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") return null;
  return JSON.parse(text.text);
}

export async function generateDashboard(
  meta: DatasetMeta,
  rows: Row[]
): Promise<{ name: string; widgets: WidgetSpec[]; insights: string[] }> {
  if (!aiEnabled()) return heuristicDashboard(meta);
  try {
    const result = await callStructured(
      `You are a senior BI analyst. Given a dataset profile, design the dashboard a business stakeholder would actually want: headline KPIs, the most decision-relevant charts, and concrete insights.\n${DESIGN_RULES}`,
      `${datasetPrompt(meta, rows)}\n\nDesign the dashboard now.`,
      DASHBOARD_SCHEMA
    );
    if (!result) return heuristicDashboard(meta);
    const widgets = sanitizeWidgets(
      (result.widgets as Omit<WidgetSpec, "id">[]) ?? [],
      meta
    );
    if (widgets.length === 0) return heuristicDashboard(meta);
    return {
      name: (result.name as string) || meta.name,
      widgets,
      insights: (result.insights as string[]) ?? [],
    };
  } catch (err) {
    console.error("AI dashboard generation failed, using fallback:", err);
    return heuristicDashboard(meta);
  }
}

export async function chatEditDashboard(
  meta: DatasetMeta,
  rows: Row[],
  dashboard: DashboardSpec,
  message: string
): Promise<{
  reply: string;
  name: string;
  widgets: WidgetSpec[];
  insights: string[];
}> {
  const current = {
    name: dashboard.name,
    widgets: dashboard.widgets.map(({ id: _id, ...w }) => w),
    insights: dashboard.insights,
  };
  if (!aiEnabled()) {
    return {
      reply:
        "AI chat editing needs an Anthropic API key. Add ANTHROPIC_API_KEY to .env.local and restart the dev server.",
      ...current,
      widgets: dashboard.widgets,
    };
  }
  const result = await callStructured(
    `You are a BI copilot. The user wants to modify their dashboard or ask questions about their data. Return the FULL updated dashboard (all widgets, including unchanged ones) plus a short reply. If the user only asks a question, answer it in "reply" using the precomputed aggregates and return the dashboard unchanged.\n${DESIGN_RULES}`,
    [
      datasetPrompt(meta, rows),
      ``,
      `Current dashboard:`,
      JSON.stringify(current, null, 1),
      ``,
      `User request: ${message}`,
    ].join("\n"),
    CHAT_SCHEMA
  );
  if (!result) throw new Error("AI call failed");
  const widgets = sanitizeWidgets(
    (result.widgets as Omit<WidgetSpec, "id">[]) ?? [],
    meta
  );
  return {
    reply: (result.reply as string) ?? "Done.",
    name: (result.name as string) || dashboard.name,
    widgets: widgets.length > 0 ? widgets : dashboard.widgets,
    insights: (result.insights as string[]) ?? dashboard.insights,
  };
}
