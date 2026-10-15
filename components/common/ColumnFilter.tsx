'use client';

import { useState } from 'react';

export function ColumnFilter({
  values,
  selected = [],
  onApply,
}: {
  values: string[];
  selected: string[];
  onApply: (vals: string[]) => void;
}) {
  const [search, setSearch] = useState('');
  const [local, setLocal] = useState<string[]>(selected);

  const filtered = values.filter(v =>
    v.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (val: string) => {
    setLocal(prev =>
      prev.includes(val)
        ? prev.filter(v => v !== val)
        : [...prev, val]
    );
  };

  const toggleAll = () => {
    if (local.length === values.length) {
      setLocal([]);
    } else {
      setLocal(values);
    }
  };

  return (
    <div className="w-64 bg-white border rounded-md shadow p-2 space-y-2">

      {/* SEARCH */}
      <input
        className="w-full border px-2 py-1 text-sm"
        placeholder="Search..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {/* SELECT ALL */}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={local.length === values.length}
          onChange={toggleAll}
        />
        Select all
      </label>

      {/* OPTIONS */}
      <div className="max-h-40 overflow-auto">
        {filtered.map(v => (
          <label key={v} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={local.includes(v)}
              onChange={() => toggle(v)}
            />
            {v}
          </label>
        ))}
      </div>

      {/* ACTIONS */}
      <div className="flex justify-between pt-2">
        <button
          className="text-xs text-gray-500"
          onClick={() => setLocal([])}
        >
          Clear
        </button>

        <button
          className="text-xs bg-blue-600 text-white px-2 py-1 rounded"
          onClick={() => onApply(local)}
        >
          Apply
        </button>
      </div>
    </div>
  );
}