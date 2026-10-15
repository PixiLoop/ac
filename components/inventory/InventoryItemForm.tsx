'use client';

import { Package2, X, Plus, MapPin } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

import { api } from "../../lib/api-client";
import { interpolateTierFactor, variableLayerPrice } from "../../lib/variable-margin";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select } from "../ui/select";
import { SearchSelect } from "../ui/SearchSelect";
import { useToast } from "../ui/toast";
import {
  Card, CardHeader, CardTitle, CardContent,
  Badge, Checkbox,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  ItemStatusBadge,
} from "./shared-ui";

// ── Types ─────────────────────────────────────────────────────────────────────
type Props = { itemId?: string };

type BogComponent = {
  productId: string;
  productCode: string;
  description: string;
  quantity: number;
  uom: string;
};

type LocationOption = { label: string; value: string };
type ProductLoc = {
  id: string;
  locationId: string;
  isPrimary: boolean;
  binCode?: string;
  location: {
    id: string; code: string; name: string;
    aisle?: string; bay?: string; level?: string; isActive: boolean;
  };
};

// Helper to restrict input value to max 2 decimals while typing
const limitTwoDecimals = (val: string) => {
  if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
    return val;
  }
  return null;
};

// ── ProductLocationsSection ───────────────────────────────────────────────────
function ProductLocationsSection({ productId }: { productId: string }) {
  const { showToast } = useToast();
  const [rows, setRows] = useState<ProductLoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [allLocations, setAllLocations] = useState<LocationOption[]>([]);
  const [newLocId, setNewLocId] = useState('');
  const [newBin, setNewBin] = useState('');
  const [newPrimary, setNewPrimary] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    api.get('/inventory/locations', { params: { isActive: 'true', take: 200 } })
      .then((res) => {
        const data = res.data?.data ?? res.data;
        const list: { id: string; code: string; name: string }[] = data?.items ?? data ?? [];
        setAllLocations(list.map((l) => ({ label: `${l.code} — ${l.name}`, value: l.id })));
      }).catch(() => { });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/inventory/items/${productId}/locations`);
      setRows(res.data?.data ?? res.data ?? []);
    } catch {
      showToast({ type: 'error', title: 'Failed to load locations' });
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => { load(); }, [load]);

  const linkedIds = new Set(rows.map((r) => r.locationId));
  const availableLocations = allLocations.filter((o) => !linkedIds.has(o.value));

  async function handleAdd() {
    if (!newLocId) return;
    setAdding(true);
    try {
      await api.post(`/inventory/items/${productId}/locations`, {
        locationId: newLocId,
        isPrimary: newPrimary || rows.length === 0,
        binCode: newBin || undefined,
      });
      showToast({ type: 'success', title: 'Location added' });
      setShowAdd(false); setNewLocId(''); setNewBin(''); setNewPrimary(false);
      load();
    } catch (err: any) {
      showToast({ type: 'error', title: err?.response?.data?.message ?? 'Failed to add' });
    } finally {
      setAdding(false);
    }
  }

  async function handleSetPrimary(locationId: string) {
    try {
      await api.patch(`/inventory/items/${productId}/locations/${locationId}/set-primary`);
      load();
    } catch { showToast({ type: 'error', title: 'Failed to update primary' }); }
  }

  async function handleRemove(locationId: string) {
    try {
      await api.delete(`/inventory/items/${productId}/locations/${locationId}`);
      showToast({ type: 'success', title: 'Location removed' });
      load();
    } catch (err: any) {
      showToast({ type: 'error', title: err?.response?.data?.message ?? 'Failed to remove' });
    }
  }

  return (
    <div className="rounded-xl border bg-emerald-50/30 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-emerald-700" />
          <h3 className="font-medium text-emerald-800">Warehouse Locations</h3>
          {rows.length > 0 && <span className="text-xs text-muted-foreground">({rows.length})</span>}
        </div>
        {!showAdd && (
          <Button size="sm" onClick={() => setShowAdd(true)} disabled={availableLocations.length === 0}>
            <Plus className="mr-1 h-3.5 w-3.5" />Add Location
          </Button>
        )}
      </div>

      {showAdd && (
        <div className="mb-3 rounded-lg border border-emerald-200 bg-white p-3">
          <p className="mb-3 text-xs font-medium text-emerald-800">Assign Location</p>
          <div className="grid gap-3 md:grid-cols-[2fr_1fr_auto_auto] items-end">
            <div className="space-y-1">
              <Label>Location</Label>
              <SearchSelect
                placeholder="Select location…"
                value={newLocId}
                options={availableLocations}
                onChange={setNewLocId}
              />
            </div>
            <div className="space-y-1">
              <Label>Bin / Slot</Label>
              <Input
                placeholder="Optional"
                value={newBin}
                onChange={(e) => setNewBin(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Primary</Label>
              <div className="flex h-10 items-center justify-center px-3 rounded-md border bg-slate-50">
                <input
                  type="checkbox"
                  className="rounded"
                  checked={newPrimary || rows.length === 0}
                  disabled={rows.length === 0}
                  onChange={(e) => setNewPrimary(e.target.checked)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" disabled={!newLocId || adding} onClick={handleAdd}>
                {adding ? '…' : 'Add'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setShowAdd(false); setNewLocId(''); setNewBin(''); }}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p className="py-4 text-center text-sm text-slate-400">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="py-4 text-center text-sm text-slate-400">No locations assigned. Click "Add Location" to assign.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Aisle</TableHead>
              <TableHead>Bay</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Bin / Slot</TableHead>
              <TableHead>Primary</TableHead>
              <TableHead>{''}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-mono">{row.location.code}</TableCell>
                <TableCell>{row.location.name}</TableCell>
                <TableCell>{row.location.aisle ?? '—'}</TableCell>
                <TableCell>{row.location.bay ?? '—'}</TableCell>
                <TableCell>{row.location.level ?? '—'}</TableCell>
                <TableCell>{row.binCode ?? '—'}</TableCell>
                <TableCell>
                  {row.isPrimary ? (
                    <Badge variant="default" className="text-xs">Primary</Badge>
                  ) : (
                    <button
                      className="text-xs text-slate-400 hover:text-amber-500 underline underline-offset-2"
                      onClick={() => handleSetPrimary(row.locationId)}
                    >
                      Set primary
                    </button>
                  )}
                </TableCell>
                <TableCell>
                  <button
                    className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500"
                    onClick={() => handleRemove(row.locationId)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

// ── Main Form ─────────────────────────────────────────────────────────────────
export function InventoryItemForm({ itemId }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const isEdit = !!itemId;

  // ── Core fields ──────────────────────────────────────────────────────────────
  const [productCode, setProductCode] = useState('');
  const [name, setName] = useState('');
  const [extendedDescription, setExtendedDescription] = useState('');
  const [vendorNumber, setVendorNumber] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [vendorPartNumber, setVendorPartNumber] = useState('');
  const [status, setStatus] = useState('Valid Item');
  const [orderRank, setOrderRank] = useState('Fixed Stock');
  const [aircoMarkupGroup, setAircoMarkupGroup] = useState('');
  const [xGroup, setXGroup] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [replacedBy, setReplacedBy] = useState('');
  const [description, setDescription] = useState('');
  const [billOfGoods, setBillOfGoods] = useState(false);
  const [onHand, setOnHand] = useState(0);
  const [packSize, setPackSize] = useState(1);
  const [grade, setGrade] = useState(1);
  const [leadTimeDays, setLeadTimeDays] = useState(0);
  const [automaticMaxQty, setAutomaticMaxQty] = useState(0);
  const [automaticMinQty, setAutomaticMinQty] = useState(0);
  const [fixedMaxQty, setFixedMaxQty] = useState(0);
  const [fixedMinQty, setFixedMinQty] = useState(0);
  const [itemType, setItemType] = useState('Item');

  const [minStock, setMinStock] = useState<string>('0');
  const [maxStock, setMaxStock] = useState<string>('0');
  const [aliasAction, setAliasAction] = useState('no_action');

  // ── Base price calculator ────────────────────────────────────────────────────
  const [netSupplierBuyPrice, setNetSupplierBuyPrice] = useState<string>('0');
  const [isTaxable, setIsTaxable] = useState(true);
  const [landedFactor, setLandedFactor] = useState<number | string>(1000);
  const [importDuty, setImportDuty] = useState<string>('0');
  const [inStoreCost, setInStoreCost] = useState<string>('0');
  const [landedCost, setLandedCost] = useState(0);

  // ── Price matrix
  const [agentFactor, setAgentFactor] = useState<string | number>(1);
  const [agentPrice, setAgentPrice] = useState(0);
  const [partnerFactor, setPartnerFactor] = useState<string | number>(1);
  const [salesPartnerPrice, setSalesPartnerPrice] = useState(0);
  const [tradeFactor, setTradeFactor] = useState<string | number>(1);
  const [tradePrice, setTradePrice] = useState(0);
  const [retailFactor, setRetailFactor] = useState<string | number>(1);
  const [retailPrice, setRetailPrice] = useState(0);
  const [agentFactorLocked, setAgentFactorLocked] = useState(false);
  const [partnerFactorLocked, setPartnerFactorLocked] = useState(false);
  const [tradeFactorLocked, setTradeFactorLocked] = useState(false);
  const [retailFactorLocked, setRetailFactorLocked] = useState(false);

  // ── FM Service Hardware  
  const [isFmHardware, setIsFmHardware] = useState(false);
  const [fmMixCode, setFmMixCode] = useState('');
  const [fmUnitCode, setFmUnitCode] = useState('');
  const [fourGUnitModem, setFourGUnitModem] = useState(false);
  const [mixUnitSim, setMixUnitSim] = useState(false);
  const [isMonitor, setIsMonitor] = useState(false);
  const [isVision, setIsVision] = useState(false);
  const [fmRuleCode, setFmRuleCode] = useState('');

  // ── Bill of Goods ─────────────────────────────────────────────────────────────
  const [bogComponents, setBogComponents] = useState<BogComponent[]>([]);
  const [showBogForm, setShowBogForm] = useState(false);
  const [newBog, setNewBog] = useState<BogComponent>({ productId: '', productCode: '', description: '', quantity: 1, uom: 'Each' });
  const [productOptions, setProductOptions] = useState<{ label: string; value: string }[]>([]);
  const [productMap, setProductMap] = useState<Record<string, { name: string; code: string; landedCost: number }>>({});

  const [saving, setSaving] = useState(false);

  // ── Group data ────────────────────────────────────────────────────────────────
  type AircoGroupData = { code: string; groupLetter: string; level: number; agentFactor: number; partnerFactor: number };
  type VariableTier = { landedLessThan: number; kRetailFactor: number; kTradeFactor: number; aRetailFactor: number; aTradeFactor: number; sortOrder: number };
  type XGroupData = { code: string; agentFactor: number; partnerFactor: number; tradeFactor: number; retailFactor: number };
  const [aircoGroupData, setAircoGroupData] = useState<AircoGroupData[]>([]);
  const [variableTiers, setVariableTiers] = useState<VariableTier[]>([]);
  const [xGroupData, setXGroupData] = useState<XGroupData[]>([]);
  const [aircoGroupOptions, setAircoGroupOptions] = useState<{ label: string; value: string }[]>([]);
  const [xGroupOptions, setXGroupOptions] = useState<{ label: string; value: string }[]>([]);

  // ── Supplier ──────────────────────────────────────────────────────────────────
  const [supplierOptions, setSupplierOptions] = useState<{ label: string; value: string }[]>([]);
  const [supplierMap, setSupplierMap] = useState<Record<string, string>>({});

  // ── Category ──────────────────────────────────────────────────────────────────
  const [productCategory, setProductCategory] = useState<null | string>(null);
  const [categoryOptions, setCategoryOptions] = useState<{ label: string; value: string }[]>([]);

  // ── Load reference data ───────────────────────────────────────────────────────
  useEffect(() => {
    api.get('/inventory/items', { params: { take: 2000, sortKey: 'productCode', sortDir: 'asc' } }).then((res) => {
      const data = res.data?.data ?? res.data;
      const list: { id: string; productCode: string; name: string; landedCost?: number }[] = data?.items ?? [];
      setProductOptions(list.map((p) => ({ label: `${p.productCode} — ${p.name}`, value: p.id })));
      setProductMap(Object.fromEntries(list.map((p) => [p.id, { name: p.name, code: p.productCode, landedCost: Number(p.landedCost ?? 0) }])));
    }).catch(() => { });

    api.get('/inventory/categories', { params: { take: 500 } }).then((res) => {
      const list: { code: string; name: string }[] = res.data?.data?.items ?? res.data?.items ?? [];
      setCategoryOptions(list.map((c) => ({ label: `(${c.code}) ${c.name}`, value: c.code })));
    }).catch(() => { });

    api.get('/inventory/suppliers', { params: { take: 500 } }).then((res) => {
      const list: { code: string; name: string }[] = res.data?.data?.items ?? res.data?.items ?? [];
      setSupplierOptions(list.map((s) => ({ label: `${s.code} — ${s.name}`, value: s.code })));
      setSupplierMap(Object.fromEntries(list.map((s) => [s.code, s.name])));
    }).catch(() => { });

    api.get('/inventory/groups/airco').then((res) => {
      const data: AircoGroupData[] = res.data?.data ?? res.data;
      const sorted = [...data].sort((a, b) =>
        a.groupLetter === b.groupLetter ? a.level - b.level : a.groupLetter.localeCompare(b.groupLetter),
      );
      setAircoGroupData(sorted);
      setAircoGroupOptions(sorted.map((g) => ({ label: g.code, value: g.code })));
    }).catch(() => { });

    api.get('/inventory/groups/variable').then((res) => {
      const data: VariableTier[] = res.data?.data ?? res.data;
      setVariableTiers([...data].sort((a, b) => a.sortOrder - b.sortOrder));
    }).catch(() => { });

    api.get('/inventory/groups/x').then((res) => {
      const data: XGroupData[] = res.data?.data ?? res.data;
      setXGroupData(data);
      setXGroupOptions(data.map((g) => ({ label: g.code, value: g.code })));

      if (!itemId) {
        const first = data.find((g) => g.code === 'X1') ?? data[0];
        if (first) {
          setXGroup(first.code);
          setAgentFactor(Number(first.agentFactor));
          setPartnerFactor(Number(first.partnerFactor));
          setTradeFactor(Number(first.tradeFactor));
          setRetailFactor(Number(first.retailFactor));
          setAgentPrice(0);
          setSalesPartnerPrice(0);
          setTradePrice(0);
          setRetailPrice(0);
        }
      }
    }).catch(() => { });
  }, []);

  // ── Load item for edit ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!itemId) return;
    api.get(`/inventory/items/${itemId}`)
      .then((res) => {
        const d = res.data?.data ?? res.data;
        setProductCode(d.productCode ?? '');
        setName(d.name ?? '');
        setExtendedDescription(d.extendedDescription ?? '');
        setVendorNumber(d.vendorNumber ?? '');
        setVendorName(d.vendorName ?? '');
        setVendorPartNumber(d.vendorPartNumber ?? '');
        setStatus(d.status ?? 'Valid Item');
        setOrderRank(d.orderRank ?? 'Fixed Stock');
        setProductCategory(d.productCategory ?? null);
        setAircoMarkupGroup(d.aircoMarkupGroup ?? '');
        setXGroup(d.xGroup ?? '');
        setIsActive(d.isActive ?? true);
        setReplacedBy(d.replacedBy ?? '');
        setDescription(d.description ?? '');
        setBillOfGoods(d.billOfGoods ?? false);
        setOnHand(Number(d.onHand ?? 0));
        setPackSize(d.packSize ?? 1);
        setGrade(d.grade ?? 1);
        setLeadTimeDays(d.leadTimeDays ?? 0);
        setAutomaticMaxQty(d.automaticMaxQty ?? 0);
        setAutomaticMinQty(d.automaticMinQty ?? 0);
        setFixedMaxQty(d.fixedMaxQty ?? 0);
        setFixedMinQty(d.fixedMinQty ?? 0);
        setMinStock(String(d.minStock ?? '0'));
        setMaxStock(String(d.maxStock ?? '0'));
        setItemType(d.itemType ?? 'Item');
        setNetSupplierBuyPrice(String(d.netSupplierBuyPrice ?? '0'));
        setIsTaxable(d.isTaxable ?? true);
        setLandedFactor(d.landedFactor ?? 1000);
        setImportDuty(String(d.importDuty ?? '0'));
        setInStoreCost(String(d.inStoreCost ?? '0'));
        setLandedCost(Number(d.landedCost ?? 0));
        setAgentFactor(Number(d.agentFactor ?? 1));
        setAgentPrice(Number(d.agentPrice ?? 0));
        setPartnerFactor(Number(d.partnerFactor ?? 1));
        setSalesPartnerPrice(Number(d.salesPartnerPrice ?? 0));
        setTradeFactor(Number(d.tradeFactor ?? 1));
        setTradePrice(Number(d.tradePrice ?? 0));
        setRetailFactor(Number(d.retailFactor ?? 1));
        setRetailPrice(Number(d.retailPrice ?? 0));
        setAgentFactorLocked(d.agentFactorLocked ?? false);
        setPartnerFactorLocked(d.partnerFactorLocked ?? false);
        setTradeFactorLocked(d.tradeFactorLocked ?? false);
        setRetailFactorLocked(d.retailFactorLocked ?? false);
        setIsFmHardware(d.isFmHardware ?? false);
        setFmMixCode(d.fmMixCode ?? '');
        setFmUnitCode(d.fmUnitCode ?? '');
        setFourGUnitModem(d.fourGUnitModem ?? false);
        setMixUnitSim(d.mixUnitSim ?? false);
        setIsMonitor(d.isMonitor ?? false);
        setIsVision(d.isVision ?? false);
        setFmRuleCode(d.fmRuleCode ?? '');
        setAliasAction(d.aliasAction ?? 'no_action');
        setBogComponents(
          (d.bogLines ?? []).map((l: any) => ({
            productId: l.componentId,
            productCode: l.componentProduct?.productCode ?? '',
            description: l.componentProduct?.name ?? '',
            quantity: Number(l.quantity),
            uom: l.uom ?? 'Each',
          })),
        );
      })
      .catch(() => showToast({ type: 'error', title: 'Failed to load item' }));
  }, [itemId]);

  // ── Auto-calculate landedCost (rounded max 2 decimals)
  useEffect(() => {
    const parsedLandedFactor = typeof landedFactor === 'number' ? landedFactor : parseFloat(landedFactor);
    if (!parseFloat(netSupplierBuyPrice) || isNaN(parsedLandedFactor)) return;
    const cost = parseFloat(netSupplierBuyPrice) * (parsedLandedFactor / 1000) * (1 + parseFloat(importDuty) / 100) + parseFloat(inStoreCost);
    setLandedCost(+cost.toFixed(2));
  }, [netSupplierBuyPrice, landedFactor, importDuty, inStoreCost]);

  // ── Recalculate factors from group/tier data (skip any locked factor) 
  useEffect(() => {
    if (xGroup && !aircoMarkupGroup) {
      const xg = xGroupData.find((g) => g.code === xGroup);
      if (!xg) return;
      if (!agentFactorLocked) setAgentFactor(xg.agentFactor);
      if (!partnerFactorLocked) setPartnerFactor(xg.partnerFactor);
      if (!tradeFactorLocked) setTradeFactor(xg.tradeFactor);
      if (!retailFactorLocked) setRetailFactor(xg.retailFactor);
    } else if (aircoMarkupGroup) {
      const ag = aircoGroupData.find((g) => g.code === aircoMarkupGroup);
      if (!ag || !variableTiers.length) return;
      const isK = ag.groupLetter === 'K';
      if (!agentFactorLocked) setAgentFactor(ag.agentFactor);
      if (!partnerFactorLocked) setPartnerFactor(ag.partnerFactor);
      if (!tradeFactorLocked) {
        setTradeFactor(interpolateTierFactor(landedCost, variableTiers, (t) => (isK ? t.kTradeFactor : t.aTradeFactor)));
      }
      if (!retailFactorLocked) {
        setRetailFactor(interpolateTierFactor(landedCost, variableTiers, (t) => (isK ? t.kRetailFactor : t.aRetailFactor)));
      }
    }
  }, [aircoMarkupGroup, xGroup, landedCost, aircoGroupData, variableTiers, xGroupData]);

  // ── Recalculate prices from current factor (locked or default) × landedCost
  useEffect(() => {
    const numAgent = typeof agentFactor === 'number' ? agentFactor : parseFloat(agentFactor) || 0;
    const numPartner = typeof partnerFactor === 'number' ? partnerFactor : parseFloat(partnerFactor) || 0;
    const numTrade = typeof tradeFactor === 'number' ? tradeFactor : parseFloat(tradeFactor) || 0;
    const numRetail = typeof retailFactor === 'number' ? retailFactor : parseFloat(retailFactor) || 0;

    setAgentPrice(+(landedCost * numAgent).toFixed(2));
    setSalesPartnerPrice(+(landedCost * numPartner).toFixed(2));
    if (aircoMarkupGroup) {
      setTradePrice(variableLayerPrice(landedCost, numAgent, numTrade));
      setRetailPrice(variableLayerPrice(landedCost, numAgent, numRetail));
    } else {
      setTradePrice(+(landedCost * numTrade).toFixed(2));
      setRetailPrice(+(landedCost * numRetail).toFixed(2));
    }
  }, [landedCost, agentFactor, partnerFactor, tradeFactor, retailFactor, aircoMarkupGroup]);

  // ── Save
  async function handleSave() {
    if (!productCode.trim()) { showToast({ type: 'error', title: 'Part number is required' }); return; }
    if (!name.trim()) { showToast({ type: 'error', title: 'Item description is required' }); return; }
    if (!vendorNumber.trim()) { showToast({ type: 'error', title: 'Supplier is required' }); return; }
    if (!parseFloat(netSupplierBuyPrice) || parseFloat(netSupplierBuyPrice) <= 0) {
      showToast({ type: 'error', title: 'Supplier Base Price is required and must be greater than zero' });
      return;
    }

    const numLandedFactor = Number(landedFactor);
    if (!landedFactor || isNaN(numLandedFactor) || numLandedFactor < 1000) {
      showToast({ type: 'error', title: 'Landed Factor is required and must be at least 1000' });
      return;
    }

    if (!aircoMarkupGroup) {
      showToast({ type: 'error', title: 'Airco Group is required' });
      return;
    }

    if (parseFloat(minStock) < 0 || parseFloat(maxStock) < 0) {
      showToast({ type: 'error', title: 'Min/Max stock must be positive' }); return;
    }
    if (parseFloat(maxStock) > 0 && parseFloat(minStock) > parseFloat(maxStock)) {
      showToast({ type: 'error', title: 'Min stock cannot exceed Max stock' }); return;
    }

    const payload = {
      productCode, name, extendedDescription, vendorNumber, vendorName, vendorPartNumber,
      productCategory: productCategory || null,
      status, orderRank,
      aircoMarkupGroup: aircoMarkupGroup || null,
      xGroup: xGroup || null,
      isActive,
      replacedBy: replacedBy || null,
      description: description || null,
      billOfGoods, onHand, packSize, grade, leadTimeDays,
      automaticMaxQty, automaticMinQty, fixedMaxQty, fixedMinQty, itemType,
      netSupplierBuyPrice: parseFloat(netSupplierBuyPrice) || 0, isTaxable,
      landedFactor: numLandedFactor,
      importDuty: parseFloat(importDuty) || 0,
      inStoreCost: parseFloat(inStoreCost) || 0,
      landedCost, 
      agentFactor: Number(agentFactor) || 0, 
      agentPrice, 
      salesPartnerPrice, 
      partnerFactor: Number(partnerFactor) || 0,
      tradePrice, 
      tradeFactor: Number(tradeFactor) || 0, 
      retailPrice, 
      retailFactor: Number(retailFactor) || 0,
      agentFactorLocked, partnerFactorLocked, tradeFactorLocked, retailFactorLocked,
      isFmHardware,
      fmMixCode: fmMixCode || null, 
      fmUnitCode: fmUnitCode || null,
      fourGUnitModem, mixUnitSim, isMonitor, isVision,
      fmRuleCode: fmRuleCode || null,
      bogLines: bogComponents.map((c, i) => ({
        componentId: c.productId, quantity: c.quantity, uom: c.uom, sortOrder: i,
      })),
      minStock: parseFloat(minStock) >= 0 ? parseFloat(minStock) : 0,
      maxStock: parseFloat(maxStock) >= 0 ? parseFloat(maxStock) : 0,
      aliasAction: aliasAction || 'no_action',
    };

    setSaving(true);
    try {
      if (isEdit) {
        await api.patch(`/inventory/items/${itemId}`, payload);
      } else {
        await api.post('/inventory/items', payload);
      }
      showToast({ type: 'success', title: `Item ${isEdit ? 'updated' : 'created'} successfully` });
      router.push('/inventory');
    } catch (err: any) {
      showToast({ type: 'error', title: err?.response?.data?.message ?? 'Failed to save item' });
    } finally {
      setSaving(false);
    }
  }

  const showFmFields = status === 'FM Service' || isFmHardware;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>{isEdit ? 'Edit Catalog Item' : 'Add Catalog Item'}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Captures all key legacy fields including status, order rank, landed factor, Airco/X groups, alias handling, stock locations, and FM service hardware extensions.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ItemStatusBadge status={status as any} />
            <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Item'}</Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* ── Row 1: Part / Description / Invoice / Category ── */}
        <div className="grid gap-4 md:grid-cols-5">
          <div className="space-y-2"><Label>Part Number</Label><Input value={productCode} onChange={(e) => setProductCode(e.target.value)} /></div>
          <div className="space-y-2 md:col-span-2"><Label>Item Description</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-2"><Label>Invoice Details</Label><Input value={extendedDescription} onChange={(e) => setExtendedDescription(e.target.value)} /></div>
          <div className="space-y-2">
            <SearchSelect value={productCategory} options={categoryOptions} placeholder="Category" onChange={e => setProductCategory(e || null)} />
          </div>
        </div>

        {/* ── Row 2: Supplier ── */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <SearchSelect
              value={vendorNumber} options={supplierOptions} placeholder="Supplier Num"
              onChange={(code) => { setVendorNumber(code); setVendorName(supplierMap[code] ?? ''); }}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Supplier Name</Label>
            <Input value={vendorName} readOnly className="bg-slate-50 text-slate-600" />
          </div>
          <div className="space-y-2"><Label>Supplier Part</Label><Input value={vendorPartNumber} onChange={(e) => setVendorPartNumber(e.target.value)} /></div>
        </div>

        {/* ── Row 3: Status / OrderRank / AircoGroup / IsActive ── */}
        <div className="grid gap-4 md:grid-cols-6">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} options={[
              { label: 'Valid Item', value: 'Valid Item' },
              { label: 'Sundry', value: 'Sundry' },
              { label: 'Airco Kit', value: 'Airco Kit' },
              { label: 'FM Service', value: 'FM Service' },
              { label: 'Replaced', value: 'Replaced' },
              { label: 'N.L.A', value: 'N.L.A' },
            ]} onChange={setStatus} />
          </div>
          <div className="space-y-2">
            <Label>Order Rank</Label>
            <Select value={orderRank} options={[
              { label: 'Fixed Stock', value: 'Fixed Stock' },
              { label: 'Committed Only', value: 'Committed Only' },
              { label: 'Auto >> Fixed', value: 'Auto >> Fixed' },
              { label: 'Full Auto', value: 'Full Auto' },
            ]} onChange={setOrderRank} />
          </div>
          <div className="space-y-2">
            <Label>Airco Group</Label>
            <Select value={aircoMarkupGroup} options={[{ label: '— None —', value: '' }, ...aircoGroupOptions]} onChange={setAircoMarkupGroup} />
          </div>

          <div className="flex items-end rounded-lg border px-3 py-2 text-sm">
            <label className="flex items-center gap-2">
              <Checkbox checked={isActive} onCheckedChange={() => setIsActive((v) => !v)} /> Inventory_Status
            </label>
          </div>

          <div className="flex items-end rounded-lg border px-3 py-2 text-sm">
            <label className="flex items-center gap-2">
              <Checkbox checked={isFmHardware} onCheckedChange={() => setIsFmHardware((v) => !v)} /> FM Hardware
            </label>
          </div>
        </div>

        {/* ── Row 4: Alias / BOG / Stock ── */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <SearchSelect value={replacedBy} options={productOptions} placeholder="Similar Item" onChange={setReplacedBy} />
          </div>
          <div className="space-y-2">
            <SearchSelect value={description} options={productOptions} placeholder="Replace / Alias" onChange={setDescription} />
          </div>
          <div className="space-y-2">
            <Label>Bill of Goods</Label>
            <div className="flex items-center h-10 px-3 rounded-md border">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={billOfGoods} onCheckedChange={() => setBillOfGoods((v) => !v)} /> Enabled
              </label>
            </div>
          </div>
          <div className="space-y-2"><Label>Current Stock</Label><Input className="text-right" value={onHand} onChange={(e) => setOnHand(parseFloat(e.target.value) || 0)} /></div>
        </div>

        {/* ── Row 5: Alias Action / XGroup / Min Stock / Max Stock ── */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label>Alias Action</Label>
            <Select value={aliasAction} options={[
              { label: 'No Action', value: 'no_action' },
              { label: 'Use Replacement', value: 'substitute' },
              { label: 'Use Alias', value: 'alias' },
            ]} onChange={setAliasAction} />
          </div>
          {!aircoMarkupGroup && (
            <div className="space-y-2">
              <Label>X Group</Label>
              <Select value={xGroup} options={xGroupOptions} onChange={setXGroup} />
            </div>
          )}
          <div className="space-y-2">
            <Label>Min Stock</Label>
            <Input
              className="text-right"
              type="number"
              min={0}
              value={minStock}
              onChange={(e) => {
                const v = e.target.value;
                if (v === '' || parseFloat(v) >= 0) setMinStock(v);
              }}
              onBlur={() => {
                const n = parseFloat(minStock);
                setMinStock(isNaN(n) || n < 0 ? '0' : String(n));
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Max Stock</Label>
            <Input
              className="text-right"
              type="number"
              min={0}
              value={maxStock}
              onChange={(e) => {
                const v = e.target.value;
                if (v === '' || parseFloat(v) >= 0) setMaxStock(v);
              }}
              onBlur={() => {
                const n = parseFloat(maxStock);
                setMaxStock(isNaN(n) || n < 0 ? '0' : String(n));
              }}
            />
          </div>
        </div>

        {/* ── Price Calculator + Matrix ── */}
        <div className="grid gap-6 xl:grid-cols-[1.05fr_1.4fr]">
          <div className="rounded-xl border p-4">
            <h3 className="mb-4 font-medium">Base Price Calculator</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Supplier Base Price</Label>
                <Input
                  className="text-right"
                  value={netSupplierBuyPrice}
                  onChange={(e) => {
                    const valid = limitTwoDecimals(e.target.value);
                    if (valid !== null) setNetSupplierBuyPrice(valid);
                  }}
                  onBlur={() => {
                    const val = parseFloat(netSupplierBuyPrice);
                    if (!isNaN(val)) setNetSupplierBuyPrice(val.toFixed(2));
                  }}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={!isTaxable} onCheckedChange={() => setIsTaxable((v) => !v)} /> Remove GST
              </label>
              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-2">
                  <Label>Landed Factor <span className="text-red-500">*</span></Label>
                  <Input
                    className="text-right"
                    value={landedFactor}
                    onChange={(e) => {
                      const valid = limitTwoDecimals(e.target.value);
                      if (valid !== null) setLandedFactor(valid);
                    }}
                    onBlur={() => {
                      const val = parseFloat(String(landedFactor));
                      if (isNaN(val) || val < 1000) setLandedFactor(1000);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Import Duty %</Label>
                  <Input
                    className="text-right"
                    value={importDuty}
                    onChange={(e) => {
                      const valid = limitTwoDecimals(e.target.value);
                      if (valid !== null) setImportDuty(valid);
                    }}
                    onBlur={() => {
                      const val = parseFloat(importDuty);
                      setImportDuty(isNaN(val) ? '0' : val.toFixed(2));
                    }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>In Store Cost</Label>
                <Input
                  className="text-right"
                  value={inStoreCost}
                  onChange={(e) => {
                    const valid = limitTwoDecimals(e.target.value);
                    if (valid !== null) setInStoreCost(valid);
                  }}
                  onBlur={() => {
                    const val = parseFloat(inStoreCost);
                    setInStoreCost(isNaN(val) ? '0' : val.toFixed(2));
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Landed Cost</Label>
                <Input className="text-right" readOnly value={landedCost.toFixed(2)} />
              </div>
            </div>
          </div>

          <div className="rounded-xl border p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-medium">Airco Price Matrix</h3>
              <Badge variant="outline">
                {aircoMarkupGroup ? `Group ${aircoMarkupGroup}` : xGroup ? `X Group ${xGroup}` : 'No Group'}
              </Badge>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Price Layer</TableHead>
                  <TableHead className="text-right">Factor</TableHead>
                  <TableHead className="text-center">Lock</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Agent Price</TableCell>
                  <TableCell>
                    <Input
                      className="text-right"
                      readOnly={!agentFactorLocked}
                      value={agentFactor}
                      onChange={(e) => {
                        const valid = limitTwoDecimals(e.target.value);
                        if (valid !== null) setAgentFactor(valid);
                      }}
                      onBlur={() => {
                        const val = parseFloat(String(agentFactor));
                        setAgentFactor(isNaN(val) ? 0 : val);
                      }}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Checkbox checked={agentFactorLocked} onCheckedChange={() => setAgentFactorLocked((v) => !v)} />
                  </TableCell>
                  <TableCell><Input className="text-right" readOnly value={Number(agentPrice).toFixed(2)} /></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Sales / Partner Price</TableCell>
                  <TableCell>
                    <Input
                      className="text-right"
                      readOnly={!partnerFactorLocked}
                      value={partnerFactor}
                      onChange={(e) => {
                        const valid = limitTwoDecimals(e.target.value);
                        if (valid !== null) setPartnerFactor(valid);
                      }}
                      onBlur={() => {
                        const val = parseFloat(String(partnerFactor));
                        setPartnerFactor(isNaN(val) ? 0 : val);
                      }}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Checkbox checked={partnerFactorLocked} onCheckedChange={() => setPartnerFactorLocked((v) => !v)} />
                  </TableCell>
                  <TableCell><Input className="text-right" readOnly value={Number(salesPartnerPrice).toFixed(2)} /></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Trade Price</TableCell>
                  <TableCell>
                    <Input
                      className="text-right"
                      readOnly={!tradeFactorLocked}
                      value={tradeFactor}
                      onChange={(e) => {
                        const valid = limitTwoDecimals(e.target.value);
                        if (valid !== null) setTradeFactor(valid);
                      }}
                      onBlur={() => {
                        const val = parseFloat(String(tradeFactor));
                        setTradeFactor(isNaN(val) ? 0 : val);
                      }}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Checkbox checked={tradeFactorLocked} onCheckedChange={() => setTradeFactorLocked((v) => !v)} />
                  </TableCell>
                  <TableCell><Input className="text-right" readOnly value={Number(tradePrice).toFixed(2)} /></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Retail Price</TableCell>
                  <TableCell>
                    <Input
                      className="text-right"
                      readOnly={!retailFactorLocked}
                      value={retailFactor}
                      onChange={(e) => {
                        const valid = limitTwoDecimals(e.target.value);
                        if (valid !== null) setRetailFactor(valid);
                      }}
                      onBlur={() => {
                        const val = parseFloat(String(retailFactor));
                        setRetailFactor(isNaN(val) ? 0 : val);
                      }}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Checkbox checked={retailFactorLocked} onCheckedChange={() => setRetailFactorLocked((v) => !v)} />
                  </TableCell>
                  <TableCell><Input className="text-right" readOnly value={Number(retailPrice).toFixed(2)} /></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>

        {/* ── Warehouse Locations (edit mode only) ── */}
        {isEdit && <ProductLocationsSection productId={itemId!} />}

        {/* ── Bill of Goods ── */}
        {billOfGoods && (
          <div className="rounded-xl border bg-orange-50/40 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package2 className="h-4 w-4 text-orange-700" />
                <h3 className="font-medium text-orange-800">Bill of Goods Components</h3>
              </div>
              {!showBogForm && (
                <Button size="sm" onClick={() => setShowBogForm(true)}>
                  <Plus className="mr-1 h-3.5 w-3.5" />Add Component
                </Button>
              )}
            </div>

            {showBogForm && (
              <div className="mb-3 rounded-lg border border-orange-200 bg-white p-3">
                <p className="mb-3 text-xs font-medium text-orange-800">New Component</p>
                <div className="grid gap-3 md:grid-cols-[2fr_2fr_1fr_1fr_auto]">
                  <SearchSelect
                    placeholder="Product"
                    value={newBog.productId}
                    options={productOptions}
                    onChange={(id) => {
                      const p = productMap[id];
                      setNewBog((prev) => ({ ...prev, productId: id, productCode: p?.code ?? '', description: p?.name ?? '' }));
                    }}
                  />
                  <div className="space-y-1">
                    <Label>Description</Label>
                    <Input value={newBog.description} placeholder="Description" onChange={(e) => setNewBog((prev) => ({ ...prev, description: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Quantity</Label>
                    <Input type="number" min={0} className="text-right" value={newBog.quantity} onChange={(e) => setNewBog((prev) => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>UOM</Label>
                    <Select value={newBog.uom} options={[
                      { label: 'Each', value: 'Each' }, { label: 'Pair', value: 'Pair' },
                      { label: 'Set', value: 'Set' }, { label: 'Kit', value: 'Kit' },
                      { label: 'Box', value: 'Box' }, { label: 'Roll', value: 'Roll' },
                      { label: 'Metre', value: 'Metre' }, { label: 'Litre', value: 'Litre' },
                    ]} onChange={(v) => setNewBog((prev) => ({ ...prev, uom: v }))} />
                  </div>
                  <div className="flex items-end gap-2">
                    <Button size="sm" disabled={!newBog.productId || newBog.quantity <= 0}
                      onClick={() => {
                        setBogComponents((prev) => [...prev, { ...newBog }]);
                        setNewBog({ productId: '', productCode: '', description: '', quantity: 1, uom: 'Each' });
                        setShowBogForm(false);
                      }}>Add</Button>
                    <Button size="sm" variant="outline" onClick={() => { setShowBogForm(false); setNewBog({ productId: '', productCode: '', description: '', quantity: 1, uom: 'Each' }); }}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {(() => {
              const bogTotal = bogComponents.reduce((sum, c) => {
                const lc = productMap[c.productId]?.landedCost ?? 0;
                return sum + lc * c.quantity;
              }, 0);
              return (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Part No</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead>UOM</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead className="text-right">Line Cost</TableHead>
                      <TableHead>{''}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bogComponents.length === 0 ? (
                      <TableRow><TableCell className="text-center text-slate-400" colSpan={7}>No components added.</TableCell></TableRow>
                    ) : (
                      <>
                        {bogComponents.map((c, i) => {
                          const unitCost = productMap[c.productId]?.landedCost ?? 0;
                          const lineCost = unitCost * c.quantity;
                          return (
                            <TableRow key={i}>
                              <TableCell className="font-mono">{c.productCode}</TableCell>
                              <TableCell>{c.description}</TableCell>
                              <TableCell className="text-right">{c.quantity}</TableCell>
                              <TableCell>{c.uom}</TableCell>
                              <TableCell className="text-right text-slate-600">
                                {unitCost > 0 ? `$${unitCost.toFixed(2)}` : <span className="text-slate-300">—</span>}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {lineCost > 0 ? `$${lineCost.toFixed(2)}` : <span className="text-slate-300">—</span>}
                              </TableCell>
                              <TableCell>
                                <button type="button" className="text-slate-400 hover:text-red-500"
                                  onClick={() => setBogComponents((prev) => prev.filter((_, j) => j !== i))}>
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {bogComponents.length > 0 && (
                          <TableRow className="border-t-2 bg-orange-50">
                            <TableCell colSpan={5} className="text-right text-xs font-semibold text-orange-800 pr-2">Total Landed Cost</TableCell>
                            <TableCell className="text-right font-bold text-orange-900">${bogTotal.toFixed(2)}</TableCell>
                            <TableCell>{""}</TableCell>
                          </TableRow>
                        )}
                      </>
                    )}
                  </TableBody>
                </Table>
              );
            })()}
          </div>
        )}

        {/* ── FM Service Hardware ── */}
        {showFmFields && (
          <div className="rounded-xl border bg-sky-50/40 p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-medium text-sky-800">FM Service Hardware</h3>
                <p className="text-sm text-muted-foreground">Additional fields appear when MIX Service Hardware applies.</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2"><Label>FM Unit Code</Label><Input value={fmUnitCode} onChange={(e) => setFmUnitCode(e.target.value)} /></div>
              <div className="space-y-2"><Label>FM MIX Code</Label><Input value={fmMixCode} onChange={(e) => setFmMixCode(e.target.value)} /></div>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-4">
              <label className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm"><Checkbox checked={fourGUnitModem} onCheckedChange={() => setFourGUnitModem((v) => !v)} /> Unit Modem / 4G</label>
              <label className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm"><Checkbox checked={mixUnitSim} onCheckedChange={() => setMixUnitSim((v) => !v)} /> Mix Unit SIM</label>
              <label className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm"><Checkbox checked={isMonitor} onCheckedChange={() => setIsMonitor((v) => !v)} /> Is Monitor Item</label>
              <label className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm"><Checkbox checked={isVision} onCheckedChange={() => setIsVision((v) => !v)} /> Is Vision Item</label>
            </div>
            <div className="mt-4 space-y-2"><Label>FM Rule Code</Label><Input value={fmRuleCode} onChange={(e) => setFmRuleCode(e.target.value)} /></div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Item'}</Button>
        </div>
      </CardContent>
    </Card>
  );
}