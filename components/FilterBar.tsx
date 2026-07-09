"use client";

import { useMemo } from "react";
import type { DatasetMeta, Row } from "@/lib/types";

export interface FilterState {
  dims: Record<string, string>;
  from: string;
  to: string;
}

export const EMPTY_FILTERS: FilterState = { dims: {}, from: "", to: "" };

export default function FilterBar({
  meta,
  rows,
  value,
  onChange,
}: {
  meta: DatasetMeta;
  rows: Row[];
  value: FilterState;
  onChange: (v: FilterState) => void;
}) {
  const dims = useMemo(
    () =>
      meta.columns
        .filter(
          (c) =>
            c.type === "string" && c.distinctCount > 1 && c.distinctCount <= 25
        )
        .slice(0, 3),
    [meta]
  );
  const dateCol = meta.columns.find((c) => c.type === "date");

  const options = useMemo(() => {
    const out = new Map<string, string[]>();
    for (const dim of dims) {
      const values = new Set<string>();
      for (const row of rows) {
        const v = row[dim.name];
        if (v !== null && v !== undefined && v !== "") values.add(String(v));
        if (values.size > 25) break;
      }
      out.set(dim.name, [...values].sort());
    }
    return out;
  }, [dims, rows]);

  const active =
    Object.values(value.dims).some(Boolean) || value.from || value.to;
  if (dims.length === 0 && !dateCol) return null;

  return (
    <div className="filter-bar">
      {dims.map((dim) => (
        <select
          key={dim.name}
          value={value.dims[dim.name] ?? ""}
          onChange={(e) =>
            onChange({
              ...value,
              dims: { ...value.dims, [dim.name]: e.target.value },
            })
          }
        >
          <option value="">All {dim.name}</option>
          {(options.get(dim.name) ?? []).map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      ))}
      {dateCol && (
        <span className="filter-dates">
          <input
            type="date"
            value={value.from}
            onChange={(e) => onChange({ ...value, from: e.target.value })}
            title={`${dateCol.name} from`}
          />
          <span className="muted">→</span>
          <input
            type="date"
            value={value.to}
            onChange={(e) => onChange({ ...value, to: e.target.value })}
            title={`${dateCol.name} to`}
          />
        </span>
      )}
      {active && (
        <button className="link-btn" onClick={() => onChange(EMPTY_FILTERS)}>
          Clear filters
        </button>
      )}
    </div>
  );
}
