"use client";

import type { DashboardSpec, DatasetMeta, Row } from "./types";

const DATASET_PREFIX = "pglu:dataset:";
const DASHBOARD_PREFIX = "pglu:dashboard:";
const API_KEY = "pglu:apiKey";

function keysWithPrefix(prefix: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(prefix)) out.push(k);
  }
  return out;
}

export function saveDataset(meta: DatasetMeta, rows: Row[]): void {
  const payload = JSON.stringify({ meta, rows });
  if (payload.length > 4_000_000) {
    throw new Error(
      "This file is too large for browser storage (~4 MB limit). Try a smaller extract."
    );
  }
  try {
    localStorage.setItem(DATASET_PREFIX + meta.id, payload);
  } catch {
    throw new Error(
      "Browser storage is full. Delete some dashboards or upload a smaller file."
    );
  }
}

export function getDataset(
  id: string
): { meta: DatasetMeta; rows: Row[] } | null {
  const raw = localStorage.getItem(DATASET_PREFIX + id);
  return raw ? JSON.parse(raw) : null;
}

export function saveDashboard(dashboard: DashboardSpec): void {
  localStorage.setItem(
    DASHBOARD_PREFIX + dashboard.id,
    JSON.stringify(dashboard)
  );
}

export function getDashboard(id: string): DashboardSpec | null {
  const raw = localStorage.getItem(DASHBOARD_PREFIX + id);
  return raw ? JSON.parse(raw) : null;
}

export function listDashboards(): DashboardSpec[] {
  return keysWithPrefix(DASHBOARD_PREFIX)
    .map((k) => JSON.parse(localStorage.getItem(k)!) as DashboardSpec)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function deleteDashboard(id: string): void {
  const dashboard = getDashboard(id);
  localStorage.removeItem(DASHBOARD_PREFIX + id);
  // Remove the dataset too if no other dashboard references it
  if (dashboard) {
    const stillUsed = listDashboards().some(
      (d) => d.datasetId === dashboard.datasetId
    );
    if (!stillUsed) localStorage.removeItem(DATASET_PREFIX + dashboard.datasetId);
  }
}

export function getApiKey(): string {
  return localStorage.getItem(API_KEY) ?? "";
}

export function setApiKey(key: string): void {
  if (key.trim()) localStorage.setItem(API_KEY, key.trim());
  else localStorage.removeItem(API_KEY);
}
