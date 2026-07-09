import fs from "fs";
import path from "path";
import crypto from "crypto";
import type { DashboardSpec, DatasetMeta, Row } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DATASETS_DIR = path.join(DATA_DIR, "datasets");
const DASHBOARDS_DIR = path.join(DATA_DIR, "dashboards");

function ensureDirs() {
  for (const dir of [DATA_DIR, DATASETS_DIR, DASHBOARDS_DIR]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
}

export function newId(): string {
  return crypto.randomBytes(6).toString("hex");
}

export function saveDataset(meta: DatasetMeta, rows: Row[]): void {
  ensureDirs();
  fs.writeFileSync(
    path.join(DATASETS_DIR, `${meta.id}.json`),
    JSON.stringify({ meta, rows })
  );
}

export function getDataset(
  id: string
): { meta: DatasetMeta; rows: Row[] } | null {
  const file = path.join(DATASETS_DIR, `${id}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

export function listDatasets(): DatasetMeta[] {
  ensureDirs();
  return fs
    .readdirSync(DATASETS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const { meta } = JSON.parse(
        fs.readFileSync(path.join(DATASETS_DIR, f), "utf-8")
      );
      return meta as DatasetMeta;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function saveDashboard(dashboard: DashboardSpec): void {
  ensureDirs();
  fs.writeFileSync(
    path.join(DASHBOARDS_DIR, `${dashboard.id}.json`),
    JSON.stringify(dashboard, null, 2)
  );
}

export function getDashboard(id: string): DashboardSpec | null {
  const file = path.join(DASHBOARDS_DIR, `${id}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

export function listDashboards(): DashboardSpec[] {
  ensureDirs();
  return fs
    .readdirSync(DASHBOARDS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map(
      (f) =>
        JSON.parse(
          fs.readFileSync(path.join(DASHBOARDS_DIR, f), "utf-8")
        ) as DashboardSpec
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
