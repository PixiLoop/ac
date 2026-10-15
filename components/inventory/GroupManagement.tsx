'use client';

import * as React from 'react';

import { api } from '../../lib/api-client';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useToast } from '../ui/toast';
import {
  Card, CardHeader, CardTitle, CardContent,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from './shared-ui';
import { useAuth } from '../../providers/auth-provider';
import { createPermissionChecker } from '../../lib/permission';

// ── Types ─────────────────────────────────────────────────────────────────────

type AircoGroup = { id: string; code: string; groupLetter: string; level: number; agentFactor: number; partnerFactor: number };
type VariableTier = { id: string; landedLessThan: number; kRetailFactor: number; kTradeFactor: number; kThreshold: number; aRetailFactor: number; aTradeFactor: number; aThreshold: number; sortOrder: number };
type XGroup = { id: string; code: string; agentFactor: number; partnerFactor: number; tradeFactor: number; retailFactor: number; isManual: boolean };
type PriceSettings = { id: string; roundBelow50: number; roundBelow100: number; roundAbove100: number; priceOffset: number; minSalesPrice: number };

// ── Validation & Calculation Helpers ─────────────────────────────────────────

function validateValue(value: any, fieldLabel: string, isFactor = false): string | null {
  const strVal = String(value ?? '').trim();
  
  if (strVal === '') {
    return `${fieldLabel} cannot be empty.`;
  }
  
  const num = Number(strVal);
  if (isNaN(num)) {
    return `${fieldLabel} must be a valid number.`;
  }
  
  if (num < 0) {
    return `${fieldLabel} cannot be negative.`;
  }
  
  if (isFactor && num < 1) {
    return `${fieldLabel} must have a minimum value of 1.`;
  }
  
  return null;
}

function getTradeDiscountPercent(tradeFactor: any, retailFactor: any): string {
  const tf = Number(tradeFactor);
  const rf = Number(retailFactor);
  if (!rf || isNaN(tf) || isNaN(rf) || rf === 0) return '0%';
  const discount = (tf / rf) * 100;
  return `${Number(discount.toFixed(2))}%`;
}

// ── Fixed Margins section ─────────────────────────────────────────────────────

function FixedMarginPanel({
  title, subtitle, letter, groups, onChange,
}: {
  title: string;
  subtitle: string;
  letter: 'A' | 'K';
  groups: AircoGroup[];
  onChange: (code: string, field: 'agentFactor' | 'partnerFactor', value: string) => void;
}) {
  const rows = groups.filter((g) => g.groupLetter === letter).sort((a, b) => a.level - b.level);
  return (
    <div className="rounded-lg border p-4">
      <p className="mb-0.5 text-[12px] font-semibold text-slate-800">{title}</p>
      <p className="mb-3 text-[11px] text-slate-500">{subtitle}</p>
      <div className="space-y-1.5">
        {rows.map((row) => (
          <div key={row.code} className="grid grid-cols-[40px_80px_60px_80px] items-center gap-x-2">
            <span className="text-[12px] font-medium text-slate-700">{row.code}</span>
            <Input
              type="number"
              min={1}
              step="any"
              value={row.agentFactor}
              onChange={(e) => onChange(row.code, 'agentFactor', e.target.value)}
              className="h-7 px-2 text-[12px] text-right"
            />
            <span className="text-[11px] text-slate-500 text-center">Partner</span>
            <Input
              type="number"
              min={1}
              step="any"
              value={row.partnerFactor}
              onChange={(e) => onChange(row.code, 'partnerFactor', e.target.value)}
              className="h-7 px-2 text-[12px] text-right"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function GroupManagement() {
  const { showToast } = useToast();

  const { permissions, isSystem, loading, user } = useAuth();
  const { has } = createPermissionChecker(permissions, isSystem);

  const canView = has('inventory.view');
  const canEdit = has('inventory.edit') || has('products.managePricing');

  const [marginTab, setMarginTab] = React.useState<'fixed' | 'variable'>('fixed');

  const [aircoGroups, setAircoGroups] = React.useState<AircoGroup[]>([]);
  const [tiers, setTiers] = React.useState<VariableTier[]>([]);
  const [xGroups, setXGroups] = React.useState<XGroup[]>([]);
  const [priceSettings, setPriceSettings] = React.useState<PriceSettings | null>(null);

  const [savingAirco, setSavingAirco] = React.useState(false);
  const [savingVariable, setSavingVariable] = React.useState(false);
  const [savingX, setSavingX] = React.useState(false);
  const [savingSettings, setSavingSettings] = React.useState(false);

  // ── Load all on mount ──────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!canView) return;
    api.get('/inventory/groups/airco').then((r) => setAircoGroups(r.data?.data ?? r.data)).catch(() => { });
    api.get('/inventory/groups/variable').then((r) => setTiers(r.data?.data ?? r.data)).catch(() => { });
    api.get('/inventory/groups/x').then((r) => setXGroups(r.data?.data ?? r.data)).catch(() => { });
    api.get('/inventory/groups/settings').then((r) => {
      const d = r.data?.data ?? r.data;
      if (d) setPriceSettings(d);
    }).catch(() => { });
  }, [canView]);

  if (!canView) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-sm text-slate-600">You do not have permission.</p>
        </CardContent>
      </Card>
    );
  }

  // ── Airco group handlers ───────────────────────────────────────────────────
  const handleAircoChange = (code: string, field: 'agentFactor' | 'partnerFactor', value: string) => {
    setAircoGroups((prev) => prev.map((g) => g.code === code ? { ...g, [field]: value } : g));
  };

  const saveAirco = async () => {
    for (const g of aircoGroups) {
      const agentErr = validateValue(g.agentFactor, `Code ${g.code} Agent Factor`, true);
      if (agentErr) {
        showToast({ type: 'error', title: agentErr });
        return;
      }
      const partnerErr = validateValue(g.partnerFactor, `Code ${g.code} Partner Factor`, true);
      if (partnerErr) {
        showToast({ type: 'error', title: partnerErr });
        return;
      }
    }

    if (priceSettings) {
      const minPriceErr = validateValue(priceSettings.minSalesPrice, 'Minimum Sales Price', false);
      if (minPriceErr) {
        showToast({ type: 'error', title: minPriceErr });
        return;
      }
    }

    setSavingAirco(true);
    try {
      await api.patch('/inventory/groups/airco', {
        rows: aircoGroups.map((g) => ({
          code: g.code,
          agentFactor: Number(g.agentFactor),
          partnerFactor: Number(g.partnerFactor),
        })),
      });

      if (priceSettings) {
        await api.patch('/inventory/groups/settings', {
          minSalesPrice: Number(priceSettings.minSalesPrice),
        });
      }

      showToast({ type: 'success', title: 'A & K factors saved' });
    } catch {
      showToast({ type: 'error', title: 'Failed to save A & K factors' });
    } finally {
      setSavingAirco(false);
    }
  };

  // ── Variable tier handlers ─────────────────────────────────────────────────
  const handleTierChange = (id: string, field: keyof Omit<VariableTier, 'id' | 'landedLessThan' | 'sortOrder'>, value: string) => {
    setTiers((prev) => prev.map((t) => t.id === id ? { ...t, [field]: value } : t));
  };

  const saveVariable = async () => {
    // Validate Variable Tier Factors
    for (const t of tiers) {
      const labelPrefix = `Tier < $${t.landedLessThan}`;

      const factorFields: Array<{ name: string; val: any }> = [
        { name: `${labelPrefix} K Retail Factor`, val: t.kRetailFactor },
        { name: `${labelPrefix} K Trade Factor`, val: t.kTradeFactor },
        { name: `${labelPrefix} A Retail Factor`, val: t.aRetailFactor },
        { name: `${labelPrefix} A Trade Factor`, val: t.aTradeFactor },
      ];

      for (const field of factorFields) {
        const err = validateValue(field.val, field.name, true);
        if (err) {
          showToast({ type: 'error', title: err });
          return;
        }
      }
    }

    setSavingVariable(true);
    try {
      await api.patch('/inventory/groups/variable', {
        rows: tiers.map((t) => {
          const kRf = Number(t.kRetailFactor);
          const kTf = Number(t.kTradeFactor);
          const aRf = Number(t.aRetailFactor);
          const aTf = Number(t.aTradeFactor);

          return {
            id: t.id,
            kRetailFactor: kRf,
            kTradeFactor: kTf,
            kThreshold: kRf ? (kTf / kRf) * 100 : 0,
            aRetailFactor: aRf,
            aTradeFactor: aTf,
            aThreshold: aRf ? (aTf / aRf) * 100 : 0,
          };
        }),
      });
      showToast({ type: 'success', title: 'Variable margins saved' });
    } catch {
      showToast({ type: 'error', title: 'Failed to save variable margins' });
    } finally {
      setSavingVariable(false);
    }
  };

  // ── X group handlers ───────────────────────────────────────────────────────
  const handleXChange = (code: string, field: keyof Omit<XGroup, 'id' | 'code' | 'isManual'>, value: string) => {
    setXGroups((prev) => prev.map((g) => g.code === code ? { ...g, [field]: value } : g));
  };

  const saveX = async () => {
    for (const row of xGroups) {
      if (row.isManual) continue;

      const factors: Array<{ name: string; val: any }> = [
        { name: `X Group ${row.code} Agent Factor`, val: row.agentFactor },
        { name: `X Group ${row.code} Partner Factor`, val: row.partnerFactor },
        { name: `X Group ${row.code} Trade Factor`, val: row.tradeFactor },
        { name: `X Group ${row.code} Retail Factor`, val: row.retailFactor },
      ];

      for (const f of factors) {
        const err = validateValue(f.val, f.name, true);
        if (err) {
          showToast({ type: 'error', title: err });
          return;
        }
      }
    }

    setSavingX(true);
    try {
      await api.patch('/inventory/groups/x', {
        rows: xGroups.map((g) => ({
          code: g.code,
          agentFactor: Number(g.agentFactor),
          partnerFactor: Number(g.partnerFactor),
          tradeFactor: Number(g.tradeFactor),
          retailFactor: Number(g.retailFactor),
        })),
      });
      showToast({ type: 'success', title: 'X groups saved' });
    } catch {
      showToast({ type: 'error', title: 'Failed to save X groups' });
    } finally {
      setSavingX(false);
    }
  };

  // ── Settings handlers ──────────────────────────────────────────────────────
  const saveSettings = async () => {
    if (!priceSettings) return;

    const settingsFields: Array<{ name: string; val: any }> = [
      { name: 'Round Below $50', val: priceSettings.roundBelow50 },
      { name: 'Round Below $100', val: priceSettings.roundBelow100 },
      { name: 'Round Above $100', val: priceSettings.roundAbove100 },
      { name: 'Price Offset', val: priceSettings.priceOffset },
      { name: 'Minimum Sales Price', val: priceSettings.minSalesPrice },
    ];

    for (const f of settingsFields) {
      const err = validateValue(f.val, f.name, false);
      if (err) {
        showToast({ type: 'error', title: err });
        return;
      }
    }

    setSavingSettings(true);
    try {
      await api.patch('/inventory/groups/settings', {
        roundBelow50: Number(priceSettings.roundBelow50),
        roundBelow100: Number(priceSettings.roundBelow100),
        roundAbove100: Number(priceSettings.roundAbove100),
        priceOffset: Number(priceSettings.priceOffset),
        minSalesPrice: Number(priceSettings.minSalesPrice),
      });
      showToast({ type: 'success', title: 'Price settings saved' });
    } catch {
      showToast({ type: 'error', title: 'Failed to save price settings' });
    } finally {
      setSavingSettings(false);
    }
  };

  const setS = (field: keyof PriceSettings, value: string) => {
    setPriceSettings((prev) => prev ? { ...prev, [field]: value } : prev);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-3">
        {/* ── Left: A & K Factors ── */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Airco Group A & K Markup Factors</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Tab toggle */}
            <div className="flex gap-1 border-b">
              {(['fixed', 'variable'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setMarginTab(tab)}
                  className={`px-4 py-2 text-[12px] font-medium border-b-2 -mb-px transition-colors ${marginTab === tab
                      ? 'border-slate-800 text-slate-900'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                  {tab === 'fixed' ? 'Fixed Margins' : 'Variable Margins'}
                </button>
              ))}
            </div>

            {/* Fixed Margins */}
            {marginTab === 'fixed' && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FixedMarginPanel
                    title="Agent Group uses Landed Cost"
                    subtitle="Markup Factor +30% = 1300"
                    letter="A"
                    groups={aircoGroups}
                    onChange={handleAircoChange}
                  />
                  <FixedMarginPanel
                    title="Sales Partner Group uses Landed Cost"
                    subtitle="Markup Factor +30% = 1300"
                    letter="K"
                    groups={aircoGroups}
                    onChange={handleAircoChange}
                  />
                </div>
                <div className="flex items-center justify-between border-t pt-4 text-[12px] text-slate-600">
                  <div className="flex items-center gap-2">
                    <span>Minimum Sales Price</span>
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      value={priceSettings?.minSalesPrice ?? ''}
                      onChange={(e) => setS('minSalesPrice', e.target.value)}
                      className="h-7 w-16 px-2 text-[12px] text-right"
                    />
                    <span>Cents</span>
                  </div>
                  <Button size="sm" onClick={saveAirco} disabled={savingAirco || !canEdit}>
                    {savingAirco ? 'Saving…' : 'Save A & K Factors'}
                  </Button>
                </div>
              </div>
            )}

            {/* Variable Margins */}
            {marginTab === 'variable' && (
              <div className="space-y-4">
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="border-b border-r px-2 py-1.5 text-left text-[11px] font-semibold text-slate-700 w-[90px]">
                          Airco Price<br />Group
                        </th>
                        <th colSpan={3} className="border-b border-r px-2 py-1.5 text-center text-[11px] font-semibold text-slate-700">Group K</th>
                        <th colSpan={3} className="border-b px-2 py-1.5 text-center text-[11px] font-semibold text-slate-700">Group A</th>
                      </tr>
                      <tr className="bg-slate-50">
                        <th className="border-b border-r px-2 py-1 text-left text-[10px] font-semibold text-slate-600">Landed<br />Less than</th>
                        <th className="border-b px-2 py-1 text-right text-[10px] font-semibold text-slate-600 w-[60px]"><span className="italic">Retail</span><br />Factor</th>
                        <th className="border-b px-2 py-1 text-right text-[10px] font-semibold text-slate-600 w-[60px]"><span className="italic">Trade</span><br />Factor</th>
                        <th className="border-b border-r px-2 py-1 text-right text-[10px] font-semibold text-slate-600 w-[60px]">Trade Disc.</th>
                        <th className="border-b px-2 py-1 text-right text-[10px] font-semibold text-slate-600 w-[60px]"><span className="italic">Retail</span><br />Factor</th>
                        <th className="border-b px-2 py-1 text-right text-[10px] font-semibold text-slate-600 w-[60px]"><span className="italic">Trade</span><br />Factor</th>
                        <th className="border-b px-2 py-1 text-right text-[10px] font-semibold text-slate-600 w-[60px]">Trade Disc.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tiers.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50/60">
                          <td className="border-r px-2 py-1 text-right font-medium text-slate-700">{Number(t.landedLessThan).toFixed(2)}</td>
                          <td className="px-1 py-0.5"><Input type="number" min={1} step="any" value={t.kRetailFactor} onChange={(e) => handleTierChange(t.id, 'kRetailFactor', e.target.value)} className="h-6 w-full px-1.5 text-[11px] text-right" /></td>
                          <td className="px-1 py-0.5"><Input type="number" min={1} step="any" value={t.kTradeFactor} onChange={(e) => handleTierChange(t.id, 'kTradeFactor', e.target.value)} className="h-6 w-full px-1.5 text-[11px] text-right" /></td>
                          <td className="border-r px-1 py-0.5">
                            <Input
                              readOnly
                              tabIndex={-1}
                              value={getTradeDiscountPercent(t.kTradeFactor, t.kRetailFactor)}
                              className="h-6 w-full px-1.5 text-[11px] text-right bg-slate-100 font-medium text-slate-600 cursor-not-allowed"
                            />
                          </td>
                          <td className="px-1 py-0.5"><Input type="number" min={1} step="any" value={t.aRetailFactor} onChange={(e) => handleTierChange(t.id, 'aRetailFactor', e.target.value)} className="h-6 w-full px-1.5 text-[11px] text-right" /></td>
                          <td className="px-1 py-0.5"><Input type="number" min={1} step="any" value={t.aTradeFactor} onChange={(e) => handleTierChange(t.id, 'aTradeFactor', e.target.value)} className="h-6 w-full px-1.5 text-[11px] text-right" /></td>
                          <td className="px-1 py-0.5">
                            <Input
                              readOnly
                              tabIndex={-1}
                              value={getTradeDiscountPercent(t.aTradeFactor, t.aRetailFactor)}
                              className="h-6 w-full px-1.5 text-[11px] text-right bg-slate-100 font-medium text-slate-600 cursor-not-allowed"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Rounding + settings */}
                <div className="flex flex-wrap items-start justify-between gap-4 border-t pt-4 text-[12px]">
                  <div className="space-y-1.5">
                    <p className="font-semibold text-slate-700">Round Price at</p>
                    {priceSettings && (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="w-36 text-slate-600">Less Than $50.00</span>
                          <Input type="number" min={0} step="any" value={priceSettings.roundBelow50} onChange={(e) => setS('roundBelow50', e.target.value)} className="h-7 w-14 px-2 text-[12px] text-right" />
                          <span className="text-slate-600">Cents</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-36 text-slate-600">Less Than $100.00</span>
                          <Input type="number" min={0} step="any" value={priceSettings.roundBelow100} onChange={(e) => setS('roundBelow100', e.target.value)} className="h-7 w-14 px-2 text-[12px] text-right" />
                          <span className="text-slate-600">Cents</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-36 text-slate-600">Above $100.00</span>
                          <Input type="number" min={0} step="any" value={priceSettings.roundAbove100} onChange={(e) => setS('roundAbove100', e.target.value)} className="h-7 w-14 px-2 text-[12px] text-right" />
                          <span className="text-slate-600">Cents</span>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <p className="font-semibold text-slate-700">Price Offset</p>
                    <p className="text-[11px] text-slate-500">Add to Price</p>
                    {priceSettings && (
                      <Input type="number" min={0} step="any" value={priceSettings.priceOffset} onChange={(e) => setS('priceOffset', e.target.value)} className="h-7 w-20 px-2 text-[12px] text-right" />
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t pt-3 text-[12px] text-slate-600">
                  <div className="flex items-center gap-2">
                    <span>Minimum Sales Price</span>
                    {priceSettings && (
                      <Input type="number" min={0} step="any" value={priceSettings.minSalesPrice} onChange={(e) => setS('minSalesPrice', e.target.value)} className="h-7 w-16 px-2 text-[12px] text-right" />
                    )}
                    <span>Cents</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={saveSettings} disabled={savingSettings || !canEdit}>
                      {savingSettings ? 'Saving…' : 'Save Settings'}
                    </Button>
                    <Button size="sm" onClick={saveVariable} disabled={savingVariable || !canEdit}>
                      {savingVariable ? 'Saving…' : 'Save Variable Margins'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Right: X Groups ── */}
        <Card>
          <CardHeader>
            <CardTitle>X Group Fixed Markup Factors</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>X Group</TableHead>
                  <TableHead className="text-right">Agent</TableHead>
                  <TableHead className="text-right">Partner</TableHead>
                  <TableHead className="text-right">Trade</TableHead>
                  <TableHead className="text-right">Retail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {xGroups.map((row) => (
                  <TableRow key={row.code}>
                    <TableCell className="font-medium">{row.code}</TableCell>
                    <TableCell className="p-1">
                      <Input type="number" min={1} step="any" value={row.agentFactor} onChange={(e) => handleXChange(row.code, 'agentFactor', e.target.value)} className="h-6 px-1.5 text-[11px] text-right" disabled={row.isManual} />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input type="number" min={1} step="any" value={row.partnerFactor} onChange={(e) => handleXChange(row.code, 'partnerFactor', e.target.value)} className="h-6 px-1.5 text-[11px] text-right" disabled={row.isManual} />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input type="number" min={1} step="any" value={row.tradeFactor} onChange={(e) => handleXChange(row.code, 'tradeFactor', e.target.value)} className="h-6 px-1.5 text-[11px] text-right" disabled={row.isManual} />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input type="number" min={1} step="any" value={row.retailFactor} onChange={(e) => handleXChange(row.code, 'retailFactor', e.target.value)} className="h-6 px-1.5 text-[11px] text-right" disabled={row.isManual} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              X9 is special: set all four sales prices manually.
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => api.get('/inventory/groups/x').then((r) => setXGroups(r.data?.data ?? r.data))}>
                Reset
              </Button>
              <Button onClick={saveX} disabled={savingX || !canEdit}>
                {savingX ? 'Saving…' : 'Save X Groups'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}