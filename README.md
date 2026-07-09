# Pglu BI

AI-first business intelligence: upload a data file, get an interactive dashboard, refine it by chat.

**The core workflow**

1. Drop a CSV, Excel (.xlsx), or JSON file on the home page.
2. The server parses and profiles it (column types, stats, distinct values).
3. Claude designs a dashboard — KPI cards, charts, and written insights grounded in precomputed aggregates.
4. Every widget runs live queries against the dataset through a structured query engine.
5. The Copilot panel edits the dashboard conversationally ("break revenue down by region", "make this a line chart") or answers questions about the data.

## Setup

```bash
npm install
npm run dev
```

Then open http://localhost:3000 and drop a file — `sample-data/sales.csv` is included to try.

### Enabling AI

Add your Anthropic API key to `.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Without a key the app still works end-to-end using a rule-based dashboard generator, but AI-designed layouts, insights, and chat editing need the key. The AI layer uses Claude (`claude-opus-4-8`) with structured JSON output, so dashboard specs are always schema-valid.

## Architecture

- **Next.js 16 (App Router)** — single codebase, API routes for the backend.
- **Datasets** are parsed with PapaParse/SheetJS, profiled, and stored as JSON under `data/` (gitignored).
- **Query engine** (`lib/query.ts`) executes structured query specs — group-by with time-grain bucketing, aggregation (sum/avg/count/min/max/distinct), filters, top-N — so the AI targets a safe, validated spec instead of raw SQL.
- **AI layer** (`lib/ai.ts`) — dashboard generation and chat editing via the Anthropic SDK with JSON-schema-constrained output; widget specs are validated against the dataset profile before use, with a heuristic fallback.
- **Charts** — Apache ECharts with a colorblind-validated palette, separate light/dark themes following `prefers-color-scheme`.

### Key files

| Path | Purpose |
| --- | --- |
| `lib/types.ts` | Dashboard/widget/query spec types shared by AI, engine, and UI |
| `lib/parse.ts` | File parsing + column profiling |
| `lib/query.ts` | In-memory aggregation engine |
| `lib/ai.ts` | Claude prompts, schemas, validation, heuristic fallback |
| `app/api/*` | Upload, generate, query, chat endpoints |
| `components/Chart.tsx` | Widget spec + query result → ECharts option |
| `components/DashboardView.tsx` | Dashboard page with widget grid and Copilot panel |
