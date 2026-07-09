# Pglu BI

AI-first business intelligence: upload a data file, get an interactive dashboard, refine it by chat.

**Live:** https://aashishbharti04.github.io/pglu-bi/

**The core workflow**

1. Drop a CSV, Excel (.xlsx), or JSON file — or click "try it with sample sales data".
2. The browser parses and profiles it (column types, stats, distinct values).
3. Claude designs a dashboard — KPI cards, charts, and written insights grounded in precomputed aggregates.
4. Every widget runs live queries against the dataset through a structured query engine.
5. The Copilot panel edits the dashboard conversationally ("break revenue down by region", "make this a line chart") or answers questions about the data.

Everything runs **in your browser**: datasets and dashboards persist in localStorage, and nothing is uploaded to any server. AI features call the Anthropic API directly from the browser using a key you paste on the home page (stored only in your localStorage, sent only to Anthropic). Without a key, a rule-based generator still produces a working dashboard.

## Development

```bash
npm install
npm run dev
```

Open http://localhost:3000. `npm run build` produces a static export in `out/`.

## Deployment

Pushes to `main` trigger [.github/workflows/deploy.yml](.github/workflows/deploy.yml), which builds the static export (with `NEXT_PUBLIC_BASE_PATH=/pglu-bi`) and publishes it to GitHub Pages.

## Architecture

- **Next.js 16 (App Router), static export** — no server; all logic is client-side.
- **Parsing** — PapaParse (CSV) / SheetJS (Excel) with column profiling in `lib/parse.ts`.
- **Query engine** (`lib/query.ts`) executes structured query specs — group-by with time-grain bucketing, aggregation (sum/avg/count/min/max/distinct), filters, top-N — so the AI targets a safe, validated spec instead of raw SQL.
- **AI layer** (`lib/ai.ts`) — dashboard generation and chat editing via the Anthropic SDK (`claude-opus-4-8`) with JSON-schema-constrained output; widget specs are validated against the dataset profile before use, with a heuristic fallback.
- **Charts** — Apache ECharts with a colorblind-validated palette, separate light/dark themes following `prefers-color-scheme`.
- **Storage** — `lib/clientStore.ts` wraps localStorage (datasets capped at ~4 MB).

### Key files

| Path | Purpose |
| --- | --- |
| `lib/types.ts` | Dashboard/widget/query spec types shared by AI, engine, and UI |
| `lib/parse.ts` | File parsing + column profiling |
| `lib/query.ts` | In-memory aggregation engine |
| `lib/ai.ts` | Claude prompts, schemas, validation, heuristic fallback |
| `lib/clientStore.ts` | localStorage persistence for datasets, dashboards, API key |
| `components/Chart.tsx` | Widget spec + query result → ECharts option |
| `components/DashboardView.tsx` | Dashboard page with widget grid and Copilot panel |
