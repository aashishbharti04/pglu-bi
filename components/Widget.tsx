"use client";

import { useEffect, useState } from "react";
import type { QueryResult, WidgetSpec } from "@/lib/types";
import { formatValue } from "@/lib/format";
import Chart from "./Chart";

export default function Widget({
  widget,
  datasetId,
  isDark,
}: {
  widget: WidgetSpec;
  datasetId: string;
  isDark: boolean;
}) {
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setResult(null);
    setError(null);
    fetch("/api/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        datasetId,
        widgetType: widget.type,
        query: widget.query,
      }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? "Query failed");
        return r.json();
      })
      .then((data) => {
        if (!cancelled) setResult(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [widget, datasetId]);

  const spanClass = `widget-span-${widget.span}`;

  if (widget.type === "kpi") {
    return (
      <div className={`card kpi ${spanClass}`}>
        <div className="card-title">{widget.title}</div>
        <div className="kpi-value">
          {result?.kind === "kpi" ? (
            formatValue(result.value, widget.format)
          ) : error ? (
            <span className="error-text">—</span>
          ) : (
            <span className="skeleton-text">···</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`card ${spanClass}`}>
      <div className="card-title">{widget.title}</div>
      <div className="card-body">
        {error ? (
          <div className="error-text">{error}</div>
        ) : !result ? (
          <div className="skeleton-chart" />
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
