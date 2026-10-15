'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { ColumnMultiFilter } from '../common/ColumnMultiFilter';
import { useTableDensity } from '../common/TableDensityContext';

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  AlignJustify,
  Rows,
  LayoutList,
} from 'lucide-react';

/* ================= TYPES ================= */

export type ColumnDef<T> = {
  key: string;
  title: string;
  sortKey?: string;
  sortable?: boolean;
  filterable?: boolean;
  filterType?: 'text' | 'multi';
  filterOptions?: { label: string; value: string }[];
  render?: (row: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string | number;
};

export type SortState = {
  key: string | null;
  dir: 'asc' | 'desc' | null;
};

type TableDensity = 'comfortable' | 'compact' | 'condensed';

type DataTableProps<T> = {
  data?: T[];
  columns: ColumnDef<T>[];
  loading?: boolean;

  page: number;
  pageSize: number;
  total: number;

  showRowsPerPage?: boolean;
  showPaginationArrows?: boolean;
  showDensityToggle?: boolean;

  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onSortChange?: (sort: SortState) => void;
  onFilterChange?: (filters: Record<string, string[]>) => void;

  initialFilters?: Record<string, string[]>;
  initialSort?: SortState;
};

export default function DataTable<T extends { id?: string | number }>({
  data,
  columns,
  loading = false,

  page,
  pageSize,
  total,

  showRowsPerPage = true,
  showPaginationArrows = true,
  showDensityToggle = true,

  onPageChange,
  onPageSizeChange,
  onSortChange,
  onFilterChange,

  initialFilters = {},
  initialSort = { key: null, dir: null },
}: DataTableProps<T>) {
  const safeData = Array.isArray(data) ? data : [];

  /* ---------- STATE ---------- */
  const [openFilterKey, setOpenFilterKey] = useState<string | null>(null);
  const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null);
  const [filters, setFilters] = useState<Record<string, string[]>>(initialFilters);
  const [sort, setSort] = useState<SortState>(initialSort);
  //const [density, setDensity] = useState<TableDensity>('comfortable');
  const { density } = useTableDensity();


  /* ---------- EFFECTS ---------- */
  useEffect(() => {
    onFilterChange?.(filters);
    onPageChange?.(1);
  }, [filters]);

  useEffect(() => {
    onSortChange?.(sort);
    if (sort.key) onPageChange?.(1);
  }, [sort]);

  /* ---------- HELPERS ---------- */
  const totalPages = Math.max(1, Math.ceil((total || 0) / pageSize));

  const densityClasses = {
    comfortable: {
      th: 'px-6 py-3 text-[12px]',
      td: 'px-6 py-3',
    },
    compact: {
      th: 'px-4 py-2 text-[12px]',
      td: 'px-4 py-2 text-sm',
    },
    condensed: {
      th: 'px-3 py-1 text-[11px]',
      td: 'px-3 py-1 text-xs',
    },
  }[density];

  const toggleSort = (col: ColumnDef<T>) => {
    if (!col.sortable) return;
    const key = col.sortKey ?? col.key;

    setSort((prev) => {
      if (prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      return { key: null, dir: null };
    });
  };

  /* ---------- HEADER CELL ---------- */
  const renderHeaderCell = (col: ColumnDef<T>) => {
    const activeSort = (col.sortKey ?? col.key) === sort.key;

    return (
      <th
        key={col.key}
        style={{ width: col.width }}
        className={`${densityClasses.th} text-slate-500 ${col.align === 'right' ? 'text-right' : 'text-left'
          }`}
      >
        <div className={`flex items-center gap-2 ${(!col.align || col.align === 'left') ? 'justify-start' : (col.align === "center" ? "justify-center" : 'justify-end')
          }`}>
          {col.sortable ? (
            <button
              type="button"
              onClick={() => toggleSort(col)}
              className="flex items-center gap-1 font-semibold text-slate-700"
            >
              {col.title}
              <span className="text-xs text-slate-400">
                {activeSort ? (sort.dir === 'asc' ? '↑' : '↓') : '↕'}
              </span>
            </button>
          ) : (
            <span className="font-semibold text-slate-700">{col.title}</span>
          )}

          {col.filterable && col.filterType === 'multi' && (
            <div className="relative">
              <button
                onClick={(e) => {
                  setOpenFilterKey(col.key);
                  setFilterAnchor(e.currentTarget);
                }}
                className="rounded border p-1"
              >
                <Filter size={14} />
              </button>

              {openFilterKey === col.key && (
                <ColumnMultiFilter
                  anchorEl={filterAnchor}
                  title={col.title}
                  options={col.filterOptions ?? []}
                  value={filters[col.key] ?? []}
                  onApply={(vals) =>
                    setFilters((f) => ({ ...f, [col.key]: vals }))
                  }
                  onClose={() => setOpenFilterKey(null)}
                />
              )}
            </div>
          )}
        </div>
      </th>
    );
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-50">
            <tr>{columns.map(renderHeaderCell)}</tr>
          </thead>

          <tbody>
            {!loading &&
              safeData.map((row) => (
                <tr key={(row.id ?? Math.random()).toString()} className="hover:bg-slate-50">
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={`${densityClasses.td} ${c.align === 'right' ? 'text-right' : ''
                        }`}
                    >
                      {c.render ? c.render(row) : (row as any)[c.key]}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* ---------- FOOTER ---------- */}
      <div className="flex items-center justify-between border-t px-4 py-3 text-[13px] text-slate-600">
        <div>
          Showing {Math.min((page - 1) * pageSize + 1, total || 0)} to{' '}
          {Math.min(page * pageSize, total || safeData.length)} of{' '}
          {total || safeData.length} records
        </div>

        <div className="flex items-center gap-2">
          {showRowsPerPage && (
            <select
              className="h-8 rounded border px-2"
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange?.(+e.target.value);
                onPageChange?.(1);
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          )}

          {showPaginationArrows && (
            <>
              <Button size="xs" variant="ghost" disabled={page === 1} onClick={() => onPageChange?.(1)}>
                <ChevronsLeft size={14} />
              </Button>
              <Button size="xs" variant="ghost" disabled={page === 1} onClick={() => onPageChange?.(page - 1)}>
                <ChevronLeft size={14} />
              </Button>
              {/* <span>Page {page} / {totalPages}</span> */}
              <span className="whitespace-nowrap">
                Page {page} / {totalPages}
              </span>

              <Button size="xs" variant="ghost" disabled={page >= totalPages} onClick={() => onPageChange?.(page + 1)}>
                <ChevronRight size={14} />
              </Button>
              <Button size="xs" variant="ghost" disabled={page >= totalPages} onClick={() => onPageChange?.(totalPages)}>
                <ChevronsRight size={14} />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
