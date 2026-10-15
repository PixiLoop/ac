'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { useOutsideClick } from '../../hooks/useOutsideClick';

type Option = { label: string; value: string };

export function ColumnMultiFilter({
  anchorEl,
  title,
  options,
  value,
  onApply,
  onClose,
}: {
  anchorEl: HTMLElement;
  title: string;
  options: Option[];
  value: string[];
  onApply: (values: string[]) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClick(ref, onClose);

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [style, setStyle] = useState<React.CSSProperties | null>(null);

  useEffect(() => {
    setSelected(value);
  }, [value]);

  useLayoutEffect(() => {
    if (!anchorEl) return;

    const rect = anchorEl.getBoundingClientRect();
    const dropdownHeight = 320; // max expected height
    const spaceBelow = window.innerHeight - rect.bottom;

    const top =
      spaceBelow < dropdownHeight
        ? rect.top - dropdownHeight - 8 // flip up
        : rect.bottom + 8;              // normal

    setStyle({
      position: 'fixed',
      top,
      left: rect.left,
      width: 280,
      zIndex: 1000,
    });
  }, [anchorEl]);

  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  const allOptionValues = options.map(o => o.value);

  /* ---------- FIXED SELECTION LOGIC ---------- */
  // All options are selected if every available option value is present in selected state
  const isAllSelected =
    options.length > 0 &&
    options.every(o => selected.includes(o.value));

  const toggleValue = (v: string) => {
    setSelected(prev =>
      prev.includes(v)
        ? prev.filter(x => x !== v)
        : [...prev, v]
    );
  };

  const toggleSelectAll = () => {
    if (isAllSelected) {
      // Deselect all
      setSelected([]);
    } else {
      // Select all option values
      setSelected(allOptionValues);
    }
  };

  const apply = () => {
    onApply(selected);
    onClose();
  };

  const clear = () => {
    setSelected([]);
    onApply([]);
    onClose();
  };

  if (!style) return null;

  /* ---------- render in portal ---------- */
  return createPortal(
    <div
      ref={ref}
      style={style}
      className="rounded-xl border bg-white shadow-xl p-3"
    >
      <div className="text-sm font-semibold mb-2">{title}</div>

      <Input
        placeholder="Search..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="mb-2 h-8"
      />

      {/* Select all */}
      <label className="flex items-center gap-2 text-sm mb-2 cursor-pointer border-b pb-1">
        <input
          type="checkbox"
          className="h-4 w-4"
          checked={isAllSelected}
          onChange={toggleSelectAll}
        />
        <span className="font-medium">Select all</span>
      </label>

      <div className="max-h-48 overflow-auto space-y-1 pr-1">
        {filtered.map(o => (
          <label key={o.value} className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={selected.includes(o.value)}
              onChange={() => toggleValue(o.value)}
            />
            <span className="truncate">{o.label}</span>
          </label>
        ))}

        {filtered.length === 0 && (
          <div className="text-xs text-slate-400 py-2 text-center">
            No values
          </div>
        )}
      </div>

      <div className="flex justify-between mt-3">
        <Button size="sm" variant="ghost" onClick={clear}>
          Clear
        </Button>
        <Button size="sm" onClick={apply}>
          Apply
        </Button>
      </div>
    </div>,
    document.body
  );
}