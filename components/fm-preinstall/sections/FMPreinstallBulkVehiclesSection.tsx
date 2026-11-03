'use client';

import { useEffect, useState } from 'react';
import { FormSection } from '../../forms/FormSection';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { api } from '../../../lib/api-client';
import { useToast } from '../../ui/toast';

export function FMPreinstallBulkVehiclesSection({
  preinstallId,
  readOnly = false,
}: {
  preinstallId: string;
  readOnly?: boolean;
}) {
  const { showToast } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = () => {
    if (!preinstallId) return;
    setLoading(true);
    api
      .get(`/fm-preinstall/${preinstallId}/bulk-vehicles`)
      .then((res) => {
        const list = res.data?.data ?? res.data ?? [];
        setRows(Array.isArray(list) ? list : []);
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [preinstallId]);

  const saveRow = async (row: any) => {
    try {
      await api.patch(`/fm-preinstall/bulk-vehicles/${row.id}`, {
        regoNumber: row.regoNumber,
        vinNumber: row.vinNumber,
        assetNumber: row.assetNumber,
        fleetNumber: row.fleetNumber,
        vehicleMake: row.vehicleMake,
        vehicleModel: row.vehicleModel,
        yearVariant: row.yearVariant,
        depot: row.depot,
        site: row.site,
        serviceCode: row.serviceCode,
        fmUnitCode: row.fmUnitCode,
        notes: row.notes,
      });
      showToast({ type: 'success', title: 'Saved', message: `Row ${row.rowNo} updated` });
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Save failed',
        message: err?.response?.data?.message || 'Could not update vehicle row',
      });
    }
  };

  if (loading && !rows.length) {
    return <div className="text-sm text-slate-500">Loading bulk vehicles…</div>;
  }

  if (!rows.length) return null;

  return (
    <FormSection title={`Bulk Vehicles (${rows.length})`} defaultOpen>
      <p className="mb-2 text-xs text-slate-500">
        One preinstall / one job / one invoice. Edit vehicle rows while the job is open; Complete to FM Install adds all of them to the log.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-slate-600 border-b">
              <th className="py-1 pr-2">#</th>
              <th className="py-1 pr-2">Rego</th>
              <th className="py-1 pr-2">VIN</th>
              <th className="py-1 pr-2">Asset</th>
              <th className="py-1 pr-2">Make</th>
              <th className="py-1 pr-2">Model</th>
              <th className="py-1 pr-2">Unit</th>
              <th className="py-1 pr-2">Service</th>
              <th className="py-1" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row.id} className="border-b border-slate-100">
                <td className="py-1 pr-2">{row.rowNo}</td>
                {(
                  [
                    'regoNumber',
                    'vinNumber',
                    'assetNumber',
                    'vehicleMake',
                    'vehicleModel',
                    'fmUnitCode',
                    'serviceCode',
                  ] as const
                ).map((key) => (
                  <td key={key} className="py-1 pr-2">
                    <Input
                      className="h-8 text-xs"
                      value={row[key] ?? ''}
                      disabled={readOnly}
                      onChange={(e) => {
                        const copy = [...rows];
                        copy[idx] = { ...copy[idx], [key]: e.target.value };
                        setRows(copy);
                      }}
                    />
                  </td>
                ))}
                <td className="py-1">
                  {!readOnly && (
                    <Button type="button" size="sm" variant="outline" onClick={() => saveRow(rows[idx])}>
                      Save
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </FormSection>
  );
}
