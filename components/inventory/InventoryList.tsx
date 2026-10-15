'use client';

import * as React from "react";
import { Package2, Search } from "lucide-react";
import { useRouter } from "next/navigation";

import { api } from "../../lib/api-client";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select } from "../ui/select";
import { SearchSelect } from "../ui/SearchSelect";
import DataTable, { type SortState } from "../common/DataTable";
import RowActions from "../common/RowActions";
import { ItemStatusBadge } from "./shared-ui";
import { useToast } from '../../components/ui/toast';
import { ExportMenu } from '../common/ExportMenu';
import { useTableExport } from '../common/useTableExport';
import { useAuth } from '../../providers/auth-provider';
import { createPermissionChecker } from '../../lib/permission';

type Item = {
  id: string;
  productCode: string;
  name: string;
  status: string;
  isActive: boolean;
  itemType: string | null;
  orderRank: string | null;
  vendorName: string | null;
  vendorNumber: string | null;
  aircoMarkupGroup: string | null;
  xGroup: string | null;
  onHand: number;
  retailPrice: number | null;
  tradePrice: number | null;
  landedCost: number | null;
  productCategory: string | null;
};

const EXPORT_COLUMNS = [
  { key: 'productCode', title: 'Part No' },
  { key: 'name', title: 'Description' },
  { key: 'vendorName', title: 'Supplier', render: (r: Item) => r.vendorName ?? '' },
  { key: 'status', title: 'Status' },
  { key: 'productCategory', title: 'Category', render: (r: Item) => r.productCategory ?? '' },
  { key: 'landedCost', title: 'Landed Cost', render: (r: Item) => r.landedCost != null ? Number(r.landedCost).toFixed(2) : '' },
  { key: 'retailPrice', title: 'Retail', render: (r: Item) => r.retailPrice != null ? Number(r.retailPrice).toFixed(2) : '' },
  { key: 'onHand', title: 'Available', render: (r: Item) => Number(r.onHand).toFixed(0) },
];

export function InventoryList() {
  const router = useRouter();
  const { showToast } = useToast();

  // ── Global search (live) ─────────────────────────────────────────────────
  const [search, setSearch] = React.useState('');

  // ── Filter bar state ─────────────────────────────────────────────────────
  const [filterCategory, setFilterCategory] = React.useState('');
  const [filterStatus, setFilterStatus] = React.useState('');
  const [filterSupplier, setFilterSupplier] = React.useState('');
  const [partNoInput, setPartNoInput] = React.useState('');   // controlled input
  const [filterPartNo, setFilterPartNo] = React.useState('');   // committed on Search click / Enter

  // ── Category options ─────────────────────────────────────────────────────
  const [categoryOptions, setCategoryOptions] = React.useState<{ label: string; value: string }[]>([]);
  const [supplierOptions, setSupplierOptions] = React.useState<{ label: string; value: string }[]>([]);

  React.useEffect(() => {
    api.get('/inventory/categories', { params: { take: 500 } }).then((res) => {
      const list: { code: string; name: string }[] = res.data?.data?.items ?? res.data?.items ?? [];
      setCategoryOptions([
        { label: 'All categories', value: '' },  
        ...list.map((c) => ({ label: c.code, value: c.code })),
      ]); // — ${c.name}
    }).catch(() => { });

    api.get('/inventory/suppliers', { params: { take: 500 } }).then((res) => {  // ← add
      const list: { code: string; name: string }[] = res.data?.data?.items ?? res.data?.items ?? [];
      setSupplierOptions(list.map((s) => ({ label: `${s.code} — ${s.name}`, value: s.code })));
    }).catch(() => {});
  }, []);
   

  

  // ── Table state ──────────────────────────────────────────────────────────
  const [sort, setSort] = React.useState<SortState>({ key: 'name', dir: 'asc' });
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [items, setItems] = React.useState<Item[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(false);

  const { permissions, isSystem } = useAuth();
  const { has } = createPermissionChecker(permissions, isSystem);
  const canView = has('inventory.view');
  const canCreate = has('inventory.create');
  const canEdit = has('inventory.edit');
  const canDelete = has('inventory.delete');

  const fetchItems = React.useCallback(() => {
    if (!canView) return;
    setLoading(true);
    api.get('/inventory/items', {
      params: {
        search: search || undefined,
        status: filterStatus || undefined,
        productCategory: filterCategory || undefined,
        productCode: filterPartNo || undefined,
        vendorNumber:    filterSupplier  || undefined,
        skip: (page - 1) * pageSize,
        take: pageSize,
        sortKey: sort.key || 'name',
        sortDir: sort.dir || 'asc',
      },
    })
      .then((res) => {
        const data = res.data?.data ?? res.data;
        setItems(data?.items ?? []);
        setTotal(data?.total ?? 0);
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, [search, filterStatus, filterCategory, filterPartNo, filterSupplier, page, pageSize, sort, canView]);

  React.useEffect(() => { fetchItems(); }, [fetchItems]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleSearch = (value: string) => { setSearch(value); setPage(1); };

  const commitPartNo = () => { setFilterPartNo(partNoInput.trim()); setPage(1); };

  const handleClear = () => {
    setSearch('');
    setFilterCategory('');
    setFilterStatus('');
    setFilterSupplier('');
    setPartNoInput('');
    setFilterPartNo('');
    setPage(1);
  };

  // ── Export ────────────────────────────────────────────────────────────────
  const fetchAll = React.useCallback(async (): Promise<Item[]> => {
    if (!canView) return [];
    const res = await api.get('/inventory/items', {
      params: {
        search: search || undefined,
        status: filterStatus || undefined,
        productCategory: filterCategory || undefined,
        productCode: filterPartNo || undefined,
        skip: 0, take: 9999,
        sortKey: sort.key || 'name',
        sortDir: sort.dir || 'asc',
      },
    });
    const data = res.data?.data ?? res.data;
    return data?.items ?? [];
  }, [search, filterStatus, filterCategory, filterPartNo, sort, canView]);

  const { exportExcel, exportPDF, exportPrint, exporting } = useTableExport({
    filename: 'inventory-items',
    title: 'Inventory Items',
    columns: EXPORT_COLUMNS,
    fetchAll,
  });

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (item: Item) => {
    if (!confirm(`Delete "${item.name}" (${item.productCode})?`)) return;
    try {
      await api.delete(`/inventory/items/${item.id}`);
      showToast({ type: 'success', title: 'Deleted', message: 'Item deleted successfully.' });
      fetchItems();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: err?.response?.status === 409 ? 'Cannot Delete' : 'Error',
        message: err?.response?.data?.message ?? 'Failed to delete item.',
      });
    }
  };

  if (!canView) {
    return <p className="text-sm text-slate-600">You do not have permission.</p>;
  }

  return (
    <div className="space-y-4">

      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative min-w-[280px] flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search description, supplier…"
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <ExportMenu
            onExcelClick={exportExcel}
            onPDFClick={exportPDF}
            onPrintClick={exportPrint}
            loading={exporting}
          />
          {canCreate && (
            <Button onClick={() => router.push('/inventory/new')}>Add Item</Button>
          )}
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-slate-50/60 px-4 py-3">

        <div className="space-y-1 flex-1 min-w-[180px] max-w-[240px]"> 
          <SearchSelect
            value={filterCategory}
            options={categoryOptions}
            placeholder="All categories"
            onChange={(v) => { setFilterCategory(v); setPage(1); }}
          />
        </div>

        <div className="space-y-1 flex-1 min-w-[200px] max-w-[260px]"> 
          <SearchSelect
            value={filterSupplier}
            options={supplierOptions}
            placeholder="All suppliers"
            onChange={(v) => { setFilterSupplier(v); setPage(1); }}
          />
        </div>

        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Status</p>
          <Select
            value={filterStatus}
            options={[
              { label: 'All statuses', value: '' },
              { label: 'Valid Item', value: 'Valid Item' },
              { label: 'FM Service', value: 'FM Service' },
              { label: 'Sundry', value: 'Sundry' },
              { label: 'Airco Kit', value: 'Airco Kit' },
              { label: 'Replaced', value: 'Replaced' },
            ]}
            onChange={(v) => { setFilterStatus(v); setPage(1); }}
            className="w-36"
          />
        </div>

        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Part No</p>
          <div className="flex gap-1">
            <Input
              value={partNoInput}
              onChange={(e) => setPartNoInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && commitPartNo()}
              placeholder="e.g. 051100"
              className="w-32"
            />
            <Button size="sm" variant="outline" onClick={commitPartNo}>
              <Search className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <Button size="sm" variant="ghost" onClick={handleClear} className="mb-0.5 text-slate-500">
          Clear
        </Button>

      </div>















      {/* ── Table ── */}
      <DataTable
        data={items}
        loading={loading}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
        onSortChange={setSort}
        columns={[
          {
            key: 'productCode',
            title: 'Part No',
            sortable: true,
            render: (row) => (
              <div className="flex items-center gap-2 font-medium">
                {row.itemType === 'BOG' && <Package2 className="h-4 w-4 text-orange-600" />}
                {row.productCode}
              </div>
            ),
          },
          { key: 'name', title: 'Description', sortable: true },
          {
            key: 'vendorName',
            title: 'Supplier',
            sortable: true,
            render: (row) => row.vendorName ?? '—',
          },
          {
            key: 'status',
            title: 'Status',
            render: (row) => <ItemStatusBadge status={row.status as any} />,
          },
          {
            key: 'retailPrice',
            title: 'Retail',
            sortable: true,
            align: 'right',
            render: (row) => row.retailPrice != null ? Number(row.retailPrice).toFixed(2) : '—',
          },
          {
            key: 'onHand',
            title: 'On Hand',
            sortable: true,
            align: 'right',
            render: (row) => Number(row.onHand).toFixed(0),
          },
          {
            key: 'actions',
            title: 'Action',
            render: (row) => (
              <RowActions
                onView={() => router.push(`/inventory/${row.id}/view`)}
                onEdit={canEdit ? () => router.push(`/inventory/${row.id}`) : undefined}
                onDelete={canDelete ? () => handleDelete(row) : undefined}
              />
            ),
          },
        ]}
      />
    </div>
  );
}