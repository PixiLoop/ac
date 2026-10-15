import React from 'react';
import { ArrowLeft, ArrowRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

type Props = {
  page: number;
  totalPages: number;
  pageSize: number;
  pageSizeOptions?: number[];
  onFirst: () => void;
  onPrev: () => void;
  onNext: () => void;
  onLast: () => void;
  onChangePageSize: (n: number) => void;
};

export default function PaginationControls({
  page,
  totalPages,
  pageSize,
  pageSizeOptions = [10, 20, 50],
  onFirst,
  onPrev,
  onNext,
  onLast,
  onChangePageSize,
}: Props) {
  return (
    <div className="flex items-center justify-end gap-3 text-sm text-slate-600">
      <div className="flex items-center gap-2">
        <span>Rows per page:</span>
        <select
          className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-sm"
          value={pageSize}
          onChange={(e) => onChangePageSize(Number(e.target.value))}
        >
          {pageSizeOptions.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      </div>

      <div className="inline-flex items-center gap-2 rounded-md">
        <button onClick={onFirst} disabled={page <= 1} className="h-8 w-8 rounded border bg-white">
          <ChevronsLeft size={16} />
        </button>
        <button onClick={onPrev} disabled={page <= 1} className="h-8 w-8 rounded border bg-white">
          <ArrowLeft size={16} />
        </button>

        <div className="px-2">Page {page} / {totalPages}</div>

        <button onClick={onNext} disabled={page >= totalPages} className="h-8 w-8 rounded border bg-white">
          <ArrowRight size={16} />
        </button>
        <button onClick={onLast} disabled={page >= totalPages} className="h-8 w-8 rounded border bg-white">
          <ChevronsRight size={16} />
        </button>
      </div>
    </div>
  );
}
