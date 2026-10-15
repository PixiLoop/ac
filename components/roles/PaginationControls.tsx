import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export default function PaginationControls({
  page,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
}) {
  return (
    <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between text-[12px] text-slate-600">
      <div>Page {page} of {totalPages}</div>

      <div className="flex items-center gap-2">
        <select className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[12px]" value={pageSize} onChange={(e) => onPageSizeChange(Number(e.target.value))}>
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </select>

        <button className="btn btn-ghost" onClick={() => onPageChange(1)} disabled={page === 1} aria-label="First page">
          <ChevronsLeft size={16} />
        </button>
        <button className="btn btn-ghost" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1} aria-label="Previous page">
          <ChevronLeft size={16} />
        </button>

        <span className="px-2">Page {page} / {totalPages}</span>

        <button className="btn btn-ghost" onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page === totalPages} aria-label="Next page">
          <ChevronRight size={16} />
        </button>
        <button className="btn btn-ghost" onClick={() => onPageChange(totalPages)} disabled={page === totalPages} aria-label="Last page">
          <ChevronsRight size={16} />
        </button>
      </div>
    </div>
  );
}
