import { NextResponse } from "next/server";
import { generateDashboard } from "@/lib/ai";
import { getDataset, listDashboards, newId, saveDashboard } from "@/lib/store";
import type { DashboardSpec } from "@/lib/types";

export async function GET() {
  return NextResponse.json(listDashboards());
}

export async function POST(req: Request) {
  const { datasetId } = await req.json();
  const dataset = getDataset(datasetId);
  if (!dataset) {
    return NextResponse.json({ error: "Dataset not found" }, { status: 404 });
  }
  const generated = await generateDashboard(dataset.meta, dataset.rows);
  const dashboard: DashboardSpec = {
    id: newId(),
    datasetId,
    createdAt: new Date().toISOString(),
    ...generated,
  };
  saveDashboard(dashboard);
  return NextResponse.json(dashboard);
}
