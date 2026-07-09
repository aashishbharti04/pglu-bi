import { NextResponse } from "next/server";
import { getDashboard, getDataset } from "@/lib/store";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const dashboard = getDashboard(id);
  if (!dashboard) {
    return NextResponse.json({ error: "Dashboard not found" }, { status: 404 });
  }
  const dataset = getDataset(dashboard.datasetId);
  return NextResponse.json({ dashboard, dataset: dataset?.meta ?? null });
}
