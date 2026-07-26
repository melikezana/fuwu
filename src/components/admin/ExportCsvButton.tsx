"use client";

import { Download } from "lucide-react";

export type CsvColumn = { header: string; key: string };

type ExportCsvButtonProps = {
  columns: CsvColumn[];
  filename: string;
  rows: Array<Record<string, unknown>>;
};

function escapeCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function ExportCsvButton({ columns, filename, rows }: ExportCsvButtonProps) {
  function download() {
    if (rows.length === 0) return;

    const header = columns.map((column) => escapeCell(column.header)).join(",");
    const body = rows
      .map((row) => columns.map((column) => escapeCell(row[column.key])).join(","))
      .join("\n");

    // Baştaki BOM, Excel'in Türkçe karakterleri doğru okumasını sağlar.
    const csv = `﻿${header}\n${body}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  return (
    <button
      className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--brand-navy)] transition-colors hover:bg-[var(--surface-soft)] disabled:opacity-50"
      disabled={rows.length === 0}
      onClick={download}
      type="button"
    >
      <Download className="h-4 w-4" aria-hidden />
      CSV indir
    </button>
  );
}
