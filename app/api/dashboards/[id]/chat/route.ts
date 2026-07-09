import { NextResponse } from "next/server";
import { chatEditDashboard } from "@/lib/ai";
import { getDashboard, getDataset, saveDashboard } from "@/lib/store";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { message } = await req.json();
  const dashboard = getDashboard(id);
  if (!dashboard) {
    return NextResponse.json({ error: "Dashboard not found" }, { status: 404 });
  }
  const dataset = getDataset(dashboard.datasetId);
  if (!dataset) {
    return NextResponse.json({ error: "Dataset not found" }, { status: 404 });
  }
  try {
    const result = await chatEditDashboard(
      dataset.meta,
      dataset.rows,
      dashboard,
      String(message ?? "")
    );
    const updated = {
      ...dashboard,
      name: result.name,
      widgets: result.widgets,
      insights: result.insights,
    };
    saveDashboard(updated);
    return NextResponse.json({ reply: result.reply, dashboard: updated });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Chat failed" },
      { status: 500 }
    );
  }
}
