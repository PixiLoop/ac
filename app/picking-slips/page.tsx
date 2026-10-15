'use client';

import { useEffect, useRef, useState } from 'react';
import { AdminShell } from '../../components/layout/AdminShell';
import { Button } from '../../components/ui/button';
import { api } from '../../lib/api-client';
import { useToast } from '../../components/ui/toast';

const STATUS_COLORS: Record<string, string> = {
  FULLY_FULFILLABLE: 'bg-green-100 text-green-700',
  PARTIALLY_FULFILLABLE: 'bg-amber-100 text-amber-700',
  NOT_FULFILLABLE: 'bg-red-100 text-red-700',
};

const STATUS_LABELS: Record<string, string> = {
  FULLY_FULFILLABLE: 'Fully Fulfilable',
  PARTIALLY_FULFILLABLE: 'Partially Fulfilable',
  NOT_FULFILLABLE: 'Not Fulfilable',
};

function formatEntryDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB');
}

export default function PickingSlipsPage() {
  const { showToast } = useToast();

  const [allCustomers, setAllCustomers] = useState<any[]>([]);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [customerFilterOpen, setCustomerFilterOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');

  const customerFilterRef = useRef<HTMLDivElement>(null);

  // Close the customer dropdown on outside click
  useEffect(() => {
    if (!customerFilterOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (customerFilterRef.current && !customerFilterRef.current.contains(e.target as Node)) {
        setCustomerFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [customerFilterOpen]);

  const [includeOnSite, setIncludeOnSite] = useState(true);

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Load full customer list once, for the filter picker
  useEffect(() => {
    api.get('/customers', { params: { skip: 0, take: 1000 } })
      .then(res => setAllCustomers(res.data?.data ?? []))
      .catch(() => setAllCustomers([]));
  }, []);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await api.get('/picking-slips/generate', {
        params: {
          customerIds: selectedCustomerIds.length ? selectedCustomerIds.join(',') : undefined,
          includeOnSite: includeOnSite ? 'true' : 'false',
        },
      });
      const result = res.data?.data ?? res.data;
      setData(result?.customers ?? []);
    } catch (err: any) {
      showToast({ type: 'error', title: 'Failed to generate picking slip', message: err?.response?.data?.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleCustomer = (id: string) => {
    setSelectedCustomerIds(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const toggleExpand = (soId: string) =>
    setExpanded(prev => ({ ...prev, [soId]: !prev[soId] }));

  const filteredCustomerOptions = allCustomers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.customerNumber.toLowerCase().includes(customerSearch.toLowerCase())
  );

  /* ---------------- Print: clean popup window, no sidebar/header ---------------- */
  const handlePrint = () => {
    const rows = data.map(cust => {
      const soRows = cust.salesOrders.map((so: any) => `
        <tr class="so-row">
          <td colspan="5">
            <strong>${so.orderNumber}</strong>
            &nbsp;Entry: ${formatEntryDate(so.createdAt)}
            &nbsp;Dispatch: ${so.dispatchType}${so.isOnSiteDispatch ? ' (On-Site)' : ''}
            &nbsp;<span class="badge">${STATUS_LABELS[so.status]}</span>
            ${so.unavailableCount > 0 ? `<span class="unavailable">${so.unavailableCount} item(s) not available</span>` : ''}
          </td>
        </tr>
        <tr class="header-row">
          <th>Part No</th><th>Bin</th><th>Description</th><th>On Hand</th><th>Ordered</th><th>Pick Qty</th>
        </tr>
        ${so.lines.map((l: any) => `
          <tr>
            <td>${l.partNo}</td>
            <td>${l.binLocation || '-'}</td>
            <td>${l.description}</td>
            <td class="right">${l.onHandQty}</td>
            <td class="right">${l.orderedQty}</td>
            <td class="right">${l.pickQty}</td>
          </tr>
        `).join('')}
      `).join('');

      return `
        <div class="customer-block">
          <div class="customer-title">${cust.customerName} (${cust.customerNumber})</div>
          <table>${soRows}</table>
        </div>
      `;
    }).join('');

    const html = `
      <html>
        <head>
          <title>Picking Slip</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; }
            h1 { font-size: 16px; margin-bottom: 16px; }
            .customer-block { margin-bottom: 20px; }
            .customer-title { font-weight: bold; font-size: 13px; background: #f1f5f9; padding: 6px 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 4px; }
            th, td { padding: 4px 8px; border-bottom: 1px solid #e2e8f0; text-align: left; }
            .header-row th { background: #f8fafc; font-size: 10px; text-transform: uppercase; color: #64748b; }
            .so-row td { padding-top: 10px; }
            .right { text-align: right; }
            .badge { background: #fee2e2; color: #b91c1c; padding: 2px 8px; border-radius: 10px; font-size: 10px; }
            .unavailable { color: #dc2626; margin-left: 8px; font-size: 11px; }
          </style>
        </head>
        <body>
          <h1>Picking Slip — ${new Date().toLocaleDateString('en-GB')}</h1>
          ${rows}
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  /* ---------------- Export: Notepad (.txt) ---------------- */
  const exportNotepad = () => {
    const lines: string[] = [];
    for (const cust of data) {
      lines.push(`Customer ${cust.customerName} (${cust.customerNumber})`);
      for (const so of cust.salesOrders) {
        lines.push(
          `Sales Ref ${so.orderNumber}  Entry: ${formatEntryDate(so.createdAt)}  Dispatch: ${so.dispatchType}  Status: ${STATUS_LABELS[so.status]}`
        );
        lines.push('BIN\tPart No\tStock\tOrder\tPick\tDetails');
        for (const l of so.lines) {
          lines.push(`${l.binLocation || '-'}\t${l.partNo}\t${l.onHandQty}\t${l.orderedQty}\t${l.pickQty}\t${l.description}`);
        }
        if (so.unavailableCount > 0) {
          lines.push(`Items Not Available on Sales Ref = ${so.unavailableCount}`);
        }
        lines.push('');
      }
      lines.push('');
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PickSlipList_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ---------------- Export: Excel (simple HTML-table trick, opens in Excel) ---------------- */
  const exportExcel = () => {
    let html = '<html><head><meta charset="UTF-8"></head><body><table border="1"><tr><th>Customer</th><th>Sales Ref</th><th>Entry Date</th><th>Dispatch</th><th>Status</th><th>Bin</th><th>Part No</th><th>Description</th><th>On Hand</th><th>Ordered</th><th>Pick Qty</th></tr>';
    for (const cust of data) {
      for (const so of cust.salesOrders) {
        for (const l of so.lines) {
          html += `<tr><td>${cust.customerName}</td><td>${so.orderNumber}</td><td>${formatEntryDate(so.createdAt)}</td><td>${so.dispatchType}</td><td>${STATUS_LABELS[so.status]}</td><td>${l.binLocation || ''}</td><td>${l.partNo}</td><td>${l.description}</td><td>${l.onHandQty}</td><td>${l.orderedQty}</td><td>${l.pickQty}</td></tr>`;
        }
      }
    }
    html += '</table></body></html>';

    // UTF-8 BOM prefix so Excel reads special characters (°, é, etc.) correctly
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PickSlipList_${new Date().toISOString().slice(0, 10)}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminShell title="Picking Slip">
      <div className="flex flex-wrap items-center gap-4 mb-4 print:hidden">
        {/* Customer multi-select */}
        <div className="relative" ref={customerFilterRef}>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Customers</label>
          <button
            type="button"
            onClick={() => setCustomerFilterOpen(o => !o)}
            className="border rounded px-3 py-2 text-sm bg-white min-w-[220px] text-left h-9"
          >
            {selectedCustomerIds.length ? `${selectedCustomerIds.length} selected` : 'All Customers'}
          </button>
          {customerFilterOpen && (
            <div className="absolute z-10 mt-1 w-72 max-h-80 overflow-y-auto border rounded bg-white shadow-lg p-2">
              <input
                type="text"
                placeholder="Search customer..."
                value={customerSearch}
                onChange={e => setCustomerSearch(e.target.value)}
                className="w-full border rounded px-2 py-1 text-sm mb-2"
              />
              {filteredCustomerOptions.map(c => (
                <label
                  key={c.id}
                  className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-slate-50 cursor-pointer rounded"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 shrink-0 accent-blue-600"
                    checked={selectedCustomerIds.includes(c.id)}
                    onChange={() => toggleCustomer(c.id)}
                  />
                  <span className="truncate">
                    {c.name} <span className="text-muted-foreground">— {c.customerNumber}</span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* On-Site Dispatch toggle */}
        <label className="flex items-center gap-2 text-sm whitespace-nowrap self-end h-9 cursor-pointer">
          <input
            type="checkbox"
            className="h-4 w-4 shrink-0"
            checked={includeOnSite}
            onChange={e => setIncludeOnSite(e.target.checked)}
          />
          <span>Include On-Site Dispatch</span>
        </label>

        <div className="self-end">
          <Button onClick={generate} disabled={loading}>
            {loading ? 'Generating…' : 'Generate'}
          </Button>
        </div>

        <div className="ml-auto self-end flex gap-2">
          <Button variant="outline" onClick={handlePrint}>Print</Button>
          <Button variant="outline" onClick={exportNotepad}>Notepad</Button>
          <Button variant="outline" onClick={exportExcel}>Excel</Button>
        </div>
      </div>

      {loading && <div className="text-sm text-slate-500">Loading…</div>}

      {!loading && data.length === 0 && (
        <div className="text-sm text-slate-500 border rounded p-6 text-center bg-white">
          No eligible Sales Orders found for the selected filters.
        </div>
      )}

      <div className="space-y-4">
        {data.map(cust => (
          <div key={cust.customerId} className="border rounded bg-white overflow-hidden">
            <div className="bg-slate-100 px-4 py-2 font-semibold text-sm">
              {cust.customerName} <span className="text-muted-foreground font-normal">({cust.customerNumber})</span>
            </div>

            {cust.salesOrders.map((so: any) => (
              <div key={so.id} className="border-t">
                <button
                  type="button"
                  onClick={() => toggleExpand(so.id)}
                  className="w-full flex items-center justify-between px-4 py-2 hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-sm">{so.orderNumber}</span>
                    <span className="text-xs text-slate-500">
                      Entry: {formatEntryDate(so.createdAt)}
                    </span>
                    <span className="text-xs text-slate-500">
                      Dispatch: {so.dispatchType}{so.isOnSiteDispatch ? ' (On-Site)' : ''}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[so.status]}`}>
                      {STATUS_LABELS[so.status]}
                    </span>
                    {so.unavailableCount > 0 && (
                      <span className="text-xs text-red-600">
                        {so.unavailableCount} item(s) not available
                      </span>
                    )}
                  </div>
                  <span className="text-slate-400 text-xs">{expanded[so.id] ? '▲' : '▼'}</span>
                </button>

                {expanded[so.id] && (
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                      <tr>
                        <th className="px-4 py-1 text-left">Part No</th>
                        <th className="px-4 py-1 text-left">Bin</th>
                        <th className="px-4 py-1 text-left">Description</th>
                        <th className="px-4 py-1 text-right">On Hand</th>
                        <th className="px-4 py-1 text-right">Ordered</th>
                        <th className="px-4 py-1 text-right">Pick Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {so.lines.map((l: any) => (
                        <tr key={l.productId} className="border-t">
                          <td className="px-4 py-1">{l.partNo}</td>
                          <td className="px-4 py-1">{l.binLocation || '—'}</td>
                          <td className="px-4 py-1">{l.description}</td>
                          <td className="px-4 py-1 text-right">{l.onHandQty}</td>
                          <td className="px-4 py-1 text-right">{l.orderedQty}</td>
                          <td className="px-4 py-1 text-right">{l.pickQty}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </AdminShell>
  );
}