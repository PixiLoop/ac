/**
 * useTableExport
 * Generic export hook — works with any DataTable.
 * Supports: Excel (.xlsx), PDF (browser print), Print (browser print)
 *
 * Usage:
 *   const { exportExcel, exportPDF, exportPrint } = useTableExport({
 *     filename: 'inventory-items',
 *     title: 'Inventory Items',
 *     columns,        // same ColumnDef[] you pass to DataTable
 *     fetchAll,       // async fn that returns ALL rows (no pagination)
 *   });
 */

'use client';

import { useCallback, useState } from 'react';
import type { ColumnDef } from '../common/DataTable'; // adjust path if needed

export type ExportColumn = {
  key: string;
  title: string;
  render?: (row: any) => string | number | null | undefined;
};

type UseTableExportOptions = {
  filename: string;
  title?: string;
  columns: ExportColumn[];
  fetchAll: () => Promise<any[]>;
};

export function useTableExport({ filename, title, columns, fetchAll }: UseTableExportOptions) {
  const [exporting, setExporting] = useState(false);

  /** Resolve a cell value to a plain string */
  function cellText(col: ExportColumn, row: any): string {
    if (col.render) {
      const v = col.render(row);
      return v == null ? '' : String(v);
    }
    const v = row[col.key];
    return v == null ? '' : String(v);
  }

  /** ── EXCEL ───────────────────────────────────────────────────────────────── */
  const exportExcel = useCallback(async () => {
    setExporting(true);
    try {
      const rows = await fetchAll();

      // Dynamic import so we don't bloat the bundle on pages that don't export
      const XLSX = await import('xlsx');

      const header = columns.map((c) => c.title);
      const data = rows.map((row) => columns.map((c) => cellText(c, row)));

      const ws = XLSX.utils.aoa_to_sheet([header, ...data]);

      // Auto column widths
      const colWidths = header.map((h, i) => ({
        wch: Math.max(
          h.length + 2,
          ...data.map((r) => (r[i] ?? '').length),
          10,
        ),
      }));
      ws['!cols'] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, title ?? filename);
      XLSX.writeFile(wb, `${filename}.xlsx`);
    } finally {
      setExporting(false);
    }
  }, [fetchAll, columns, filename, title]);

  /** ── PRINT / PDF ─────────────────────────────────────────────────────────── */
  const printHTML = useCallback(async (forPDF = false) => {
    setExporting(true);
    try {
      const rows = await fetchAll();

      const headerRow = columns
        .map((c) => `<th style="padding:6px 10px;border:1px solid #cbd5e1;background:#f1f5f9;font-size:11px;text-align:left;white-space:nowrap">${c.title}</th>`)
        .join('');

      const bodyRows = rows
        .map((row) => {
          const cells = columns
            .map((c) => `<td style="padding:5px 10px;border:1px solid #e2e8f0;font-size:11px">${cellText(c, row)}</td>`)
            .join('');
          return `<tr>${cells}</tr>`;
        })
        .join('');

      const printedAt = new Date().toLocaleString('en-AU', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });

      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>${title ?? filename}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; padding: 20px; color: #1e293b; }
    h1  { font-size: 16px; margin-bottom: 4px; }
    .meta { font-size: 11px; color: #64748b; margin-bottom: 12px; }
    table { border-collapse: collapse; width: 100%; }
    tr:nth-child(even) td { background: #f8fafc; }
    @media print {
      @page { margin: 15mm; size: A4 landscape; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <h1>${title ?? filename}</h1>
  <div class="meta">Printed: ${printedAt} &nbsp;|&nbsp; ${rows.length} records</div>
  <table>
    <thead><tr>${headerRow}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
</body>
</html>`;

      const win = window.open('', '_blank', 'width=1100,height=750');
      if (!win) { alert('Pop-up blocked — allow pop-ups and try again.'); return; }
      win.document.write(html);
      win.document.close();
      win.focus();

      // Small delay so styles render before print dialog
      setTimeout(() => {
        win.print();
        if (forPDF) {
          // For PDF: user selects "Save as PDF" in the browser print dialog
          // We close the window after a reasonable delay
          setTimeout(() => win.close(), 2000);
        }
      }, 400);
    } finally {
      setExporting(false);
    }
  }, [fetchAll, columns, filename, title]);

  const exportPDF   = useCallback(() => printHTML(true),  [printHTML]);
  const exportPrint = useCallback(() => printHTML(false), [printHTML]);

  return { exportExcel, exportPDF, exportPrint, exporting };
}