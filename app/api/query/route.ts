import { NextResponse } from "next/server";
import { runQuery } from "@/lib/query";
import { getDataset } from "@/lib/store";
import type { QuerySpec, WidgetType } from "@/lib/types";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    datasetId: string;
    widgetType: WidgetType;
    query: QuerySpec;
  };
  const dataset = getDataset(body.datasetId);
  if (!dataset) {
    return NextResponse.json({ error: "Dataset not found" }, { status: 404 });
  }
  try {
    const result = runQuery(
      dataset.rows,
      dataset.meta,
      body.widgetType,
      body.query
    );
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Query failed" },
      { status: 400 }
    );
  }
}
