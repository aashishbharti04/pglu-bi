import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { ColumnProfile, ColumnType, DatasetMeta, Row } from "./types";

const DATE_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}([T ].*)?$/, // ISO date / datetime
  /^\d{4}-\d{2}$/, // year-month
  /^\d{1,2}\/\d{1,2}\/\d{4}$/, // M/D/YYYY
  /^\d{4}\/\d{1,2}\/\d{1,2}$/, // YYYY/M/D
];

export function looksLikeDate(v: unknown): boolean {
  if (typeof v !== "string") return false;
  const s = v.trim();
  if (!DATE_PATTERNS.some((re) => re.test(s))) return false;
  return !Number.isNaN(Date.parse(s.length === 7 ? s + "-01" : s));
}

export function parseFile(data: ArrayBuffer, filename: string): Row[] {
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  if (ext === "xlsx" || ext === "xls") {
    const wb = XLSX.read(new Uint8Array(data), {
      type: "array",
      cellDates: true,
    });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: null,
    });
    // Normalize Date objects to ISO strings
    return rows.map((r) => {
      const out: Row = {};
      for (const [k, v] of Object.entries(r)) {
        out[k] =
          v instanceof Date ? v.toISOString().slice(0, 10) : (v as Row[string]);
      }
      return out;
    });
  }
  const text = new TextDecoder().decode(data);
  if (ext === "json") {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed))
      throw new Error("JSON file must be an array of objects");
    return parsed as Row[];
  }
  // CSV / TSV / TXT
  const result = Papa.parse<Row>(text, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
  });
  if (result.errors.length > 0 && result.data.length === 0) {
    throw new Error(`Could not parse file: ${result.errors[0].message}`);
  }
  return result.data;
}

function detectType(values: unknown[]): ColumnType {
  const nonNull = values.filter((v) => v !== null && v !== undefined && v !== "");
  if (nonNull.length === 0) return "string";
  if (nonNull.every((v) => typeof v === "boolean")) return "boolean";
  if (nonNull.every((v) => typeof v === "number" && Number.isFinite(v)))
    return "number";
  if (nonNull.every((v) => looksLikeDate(v))) return "date";
  return "string";
}

export function profileDataset(id: string, name: string, rows: Row[]): DatasetMeta {
  const columnNames = rows.length > 0 ? Object.keys(rows[0]) : [];
  const columns: ColumnProfile[] = columnNames.map((col) => {
    const values = rows.map((r) => r[col]);
    const nonNull = values.filter(
      (v) => v !== null && v !== undefined && v !== ""
    );
    const type = detectType(values);
    const distinct = new Set(nonNull.map((v) => String(v)));
    const profile: ColumnProfile = {
      name: col,
      type,
      distinctCount: distinct.size,
      nullCount: values.length - nonNull.length,
      sampleValues: [...distinct].slice(0, 8) as ColumnProfile["sampleValues"],
    };
    if (type === "number") {
      const nums = nonNull as number[];
      profile.min = Math.min(...nums);
      profile.max = Math.max(...nums);
      profile.sum = nums.reduce((a, b) => a + b, 0);
      profile.mean = profile.sum / nums.length;
    }
    if (type === "date") {
      const sorted = (nonNull as string[]).slice().sort();
      profile.minDate = sorted[0];
      profile.maxDate = sorted[sorted.length - 1];
    }
    return profile;
  });
  return {
    id,
    name,
    rowCount: rows.length,
    columns,
    createdAt: new Date().toISOString(),
  };
}
