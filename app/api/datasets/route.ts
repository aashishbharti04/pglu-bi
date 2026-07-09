import { NextResponse } from "next/server";
import { parseFile, profileDataset } from "@/lib/parse";
import { listDatasets, newId, saveDataset } from "@/lib/store";

export async function GET() {
  return NextResponse.json(listDatasets());
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const rows = parseFile(buffer, file.name);
    if (rows.length === 0) {
      return NextResponse.json(
        { error: "The file contains no data rows" },
        { status: 400 }
      );
    }
    const id = newId();
    const meta = profileDataset(id, file.name, rows);
    saveDataset(meta, rows);
    return NextResponse.json(meta);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 400 }
    );
  }
}
