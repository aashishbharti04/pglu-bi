"use client";

import { useMemo } from "react";
import type { DatasetMeta, QueryResult, Row, WidgetSpec } from "@/lib/types";
import { runQuery } from "@/lib/query";
import { formatValue } from "@/lib/format";
import Chart from "./Chart";

export default function Widget({
  widget,
  meta,
  rows,
  isDark,
}: {
  widget: WidgetSpec;
  meta: DatasetMeta;
  rows: Row[];
  isDark: boolean;
}) {
  const { result, error } = useMemo((): {
    result: QueryResult | null;
    error: string | null;
  } => {
    try {
      return {
        result: runQuery(rows, meta, widget.type, widget.query),
        error: null,
      };
    } catch (e) {
      return {
        result: null,
        error: e instanceof Error ? e.message : "Query failed",
      };
    }
  }, [widget, meta, rows]);

  const spanClass = `widget-span-${widget.span}`;

  if (widget.type === "kpi") {
    return (
      <div className={`card kpi ${spanClass}`}>
        <div className="card-title">{widget.title}</div>
        <div className="kpi-value">
          {result?.kind === "kpi" ? (
            formatValue(result.value, widget.format)
          ) : (
            <span className="error-text">—</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`card ${spanClass}`}>
      <div className="card-title">{widget.title}</div>
      <div className="card-body">
        {error || !result ? (
          <div className="error-text">{error ?? "No data"}</div>
        ) : result.kind === "table" ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {result.columns.map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row, i) => (
                  <tr key={i}>
                    {result.columns.map((c) => (
                      <td key={c}>
                        {typeof row[c] === "number"
                          ? formatValue(row[c] as number)
                          : String(row[c] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Chart widget={widget} result={result} isDark={isDark} />
        )}
      </div>
    </div>
  );
}
