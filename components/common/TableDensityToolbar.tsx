'use client';

import {
  AlignJustify,
  LayoutList,
  Rows,
  Expand,
  List as ListIcon,
} from 'lucide-react';
import { useTableDensity } from './TableDensityContext';

export function TableDensityToolbar() {
  const { density, setDensity } = useTableDensity();

  const btn = (active: boolean) =>
    `rounded p-1 ${
      active ? 'bg-slate-200' : 'hover:bg-slate-100'
    }`;

  return (
    <div className="flex items-center gap-1">
      <button
        title="Distributed"
        onClick={() => setDensity('comfortable')}
        className={btn(density === 'comfortable')}
      >
        <Expand className="h-4 w-4" />
      </button>

      <button
        title="Compact"
        onClick={() => setDensity('compact')}
        className={btn(density === 'compact')}
      >
        <AlignJustify className="h-4 w-4" />
      </button>

      <button
        title="Condensed"
        onClick={() => setDensity('condensed')}
        className={btn(density === 'condensed')}
      >
         <ListIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
