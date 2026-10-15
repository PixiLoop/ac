'use client';

import { useState, useEffect } from 'react';
import { api } from '../../../lib/api-client';

export function ItemSearchSelect({
  value,
  onSelect,
}: {
  value?: string;
  onSelect: (item: any) => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (!open) return;

    api
      .get('/products', {
        params: { category: 'K3', search: query },
      })
      .then(res => setItems(res.data));
  }, [query, open]);

  return (
    <div className="relative">
      <input
        className="w-full rounded-md border px-3 py-2 text-sm"
        placeholder="Type item / part no"
        value={query}
        onChange={e => {
          setQuery(e.target.value);
          setOpen(true);
        }}
      />

      {open && (
        <div className="absolute z-50 mt-1 w-full border rounded-md bg-white shadow max-h-56 overflow-auto">
          {items.map(item => (
            <div
              key={item.id}
              className="px-3 py-2 text-sm hover:bg-slate-100 cursor-pointer"
              onClick={() => {
                onSelect({
                  productId: item.id,
                  partNo: item.productCode,
                  description: item.description,
                  unitPrice:
                    item.prices?.[0]?.price ?? 0,
                });
                setOpen(false);
              }}
            >
              <div className="font-medium">
                {item.productCode}
              </div>
              <div className="text-xs text-slate-500">
                {item.description}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}