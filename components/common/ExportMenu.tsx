'use client';

/**
 * ExportMenu
 * Drop-in export button with PDF / Print / Excel dropdown.
 * Works with useTableExport hook.
 *
 * Usage:
 *   <ExportMenu
 *     onExcelClick={exportExcel}
 *     onPDFClick={exportPDF}
 *     onPrintClick={exportPrint}
 *     loading={exporting}
 *   />
 */

import { useRef, useState, useEffect } from 'react';
import { Download, FileSpreadsheet, FileText, Printer, ChevronDown, Loader2 } from 'lucide-react';

type ExportMenuProps = {
  onExcelClick: () => void;
  onPDFClick:   () => void;
  onPrintClick: () => void;
  loading?: boolean;
};

export function ExportMenu({ onExcelClick, onPDFClick, onPrintClick, loading }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function pick(fn: () => void) {
    setOpen(false);
    fn();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={loading}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
      >
        {loading
          ? <Loader2 className="h-4 w-4 animate-spin" />
          : <Download className="h-4 w-4" />}
        Export
        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          <button
            type="button"
            onClick={() => pick(onExcelClick)}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            <FileSpreadsheet className="h-4 w-4 text-green-600" />
            Excel (.xlsx)
          </button>
          <button
            type="button"
            onClick={() => pick(onPDFClick)}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            <FileText className="h-4 w-4 text-red-500" />
            PDF
          </button>
          <button
            type="button"
            onClick={() => pick(onPrintClick)}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            <Printer className="h-4 w-4 text-slate-500" />
            Print
          </button>
        </div>
      )}
    </div>
  );
}
