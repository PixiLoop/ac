'use client';

import { useState, useEffect } from 'react';

import { api } from '../../../lib/api-client';
import { useAuth } from '../../../providers/auth-provider';
import { FMPreinstallDetailsSection } from '../../../components/fm-preinstall/sections/FMPreinstallDetailsSection';
import { FMPreinstallItemsSection } from '../../../components/fm-preinstall/sections/FMPreinstallItemsSection';
import { FMInstallDetailsPanel } from '../../../components/fm-preinstall/sections/FMInstallDetailsPanel';
import { ShippingDetailsSection } from '../../../components/salesorders/sections/ShippingDetailsSection';
import { AccountDetailsSection } from '../../../components/salesorders/sections/AccountDetailsSection';
import { fmHardwarePrefill } from '../../../lib/fm-hardware-prefill';
import { FMPreinstallBulkVehiclesSection } from '../../../components/fm-preinstall/sections/FMPreinstallBulkVehiclesSection';

export function FMPreinstallForm({
  form,
  setForm,
  shipping,
  setShipping,
  account,
  setAccount,
  items,
  setItems,
  activeItem,
  setActiveItem,
  users,
  isLocked,
  installDetail,
  setInstallDetail,
  invalidFields = [],
  preinstallId,
}: any) {
  const { user } = useAuth();
  const [userOptions, setUserOptions] = useState<any[]>(Array.isArray(users) ? users : []);
  const [showInstallPanel, setShowInstallPanel] = useState(true);

  useEffect(() => {
    api
      .get('/users', { params: { take: 200, sortKey: 'user', sortDir: 'asc' } })
      .then((res) => {
        const data =
          res.data?.data?.items ||
          res.data?.data?.data ||
          res.data?.data ||
          res.data;
        setUserOptions(Array.isArray(data) ? data : []);
      })
      .catch(() => setUserOptions([]));
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    setUserOptions((prev) => {
      if (prev.some((u: any) => u.id === user.id)) return prev;
      const label =
        user.displayName ||
        `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() ||
        user.email;
      return [{ id: user.id, displayName: label }, ...prev];
    });
  }, [user]);

  useEffect(() => {
    if (!user?.id) return;
    setForm((prev: any) => {
      if (prev?.assignedUserId) return prev;
      return { ...prev, assignedUserId: user.id };
    });
  }, [user?.id, setForm]);

  useEffect(() => {
    if (invalidFields?.length) setShowInstallPanel(true);
  }, [invalidFields]);

  const update = (k: string, v: any) => {
    setForm((p: any) => {
      const next = { ...p, [k]: v };
      if (k === 'type') {
        next.installType = v;
        setInstallDetail((prev: any) => ({ ...prev, installType: v }));
      }
      if (k === 'installType') {
        next.type = v;
      }
      if (['installLocation', 'installer', 'installDate', 'installType'].includes(k)) {
        setInstallDetail((prev: any) => ({ ...prev, [k]: v }));
      }
      return next;
    });
  };

  const updateCharges = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const updateShipping = (k: string, v: any) => {
    const mapped = k === 'shippingName' ? 'name' : k;
    setShipping((prev: any) => ({ ...prev, [mapped]: v }));
  };

  const updateAccount = (k: string, v: any) => {
    const mapped = k === 'shippingName' || k === 'billingName' ? 'name' : k;
    setAccount((prev: any) => ({ ...prev, [mapped]: v }));
  };

  const parts = items.reduce((acc: number, i: any) => {
    const qty = Number(i.quantity ?? 1);
    const price = Number(i.unitPrice ?? 0);
    return acc + qty * price;
  }, 0);
  const sundries = Number(form.chargeSundries ?? 0);
  const labour = Number(form.chargeLabour ?? 0);
  const freight = Number(form.chargeFreight ?? 0);
  const gst = parseFloat(((parts + sundries + labour + freight) * 0.1).toFixed(2));
  const rounding = Number(form.chargeRounding ?? 0);
  const total = parseFloat((parts + sundries + labour + freight + gst + rounding).toFixed(2));

  return (
    <div className="space-y-4 pb-8">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        <div className="xl:col-span-5 min-w-0">
          <FMPreinstallDetailsSection
            value={{
              ...form,
              installLocation: form.installLocation ?? installDetail?.installLocation ?? '',
              installer: form.installer ?? installDetail?.installer ?? '',
              installDate: form.installDate ?? installDetail?.installDate ?? '',
            }}
            update={update}
            setItems={setItems}
            setShipping={setShipping}
            setAccount={setAccount}
            setInstallDetail={setInstallDetail}
            disabled={isLocked}
            invalidFields={invalidFields}
          />
        </div>

        <div className="xl:col-span-4 min-w-0">
          <ShippingDetailsSection
            value={{ ...shipping, shippingName: shipping.name }}
            update={updateShipping}
            showMap={false}
          />
        </div>

        <div className="xl:col-span-3 min-w-0">
          <AccountDetailsSection
            value={{ ...account, billingName: account.name }}
            update={updateAccount}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-semibold"
          onClick={() => {
            setShowInstallPanel((v) => !v);
            setActiveItem(null);
          }}
        >
          {showInstallPanel ? 'Hide Install Details' : 'Install Details'}
        </button>
      </div>

      {form?.isBulk && preinstallId ? (
        <FMPreinstallBulkVehiclesSection
          preinstallId={preinstallId}
          readOnly={isLocked || form.status === 'INVOICED' || form.status === 'COMPLETED'}
        />
      ) : null}

      <div
        className={`grid grid-cols-1 gap-4 items-start ${
          showInstallPanel ? 'xl:grid-cols-12' : ''
        }`}
      >
        <div className={`min-w-0 space-y-4 ${showInstallPanel ? 'xl:col-span-7' : ''}`}>
          <FMPreinstallItemsSection
            items={items}
            setItems={setItems}
            pricingContext={form}
            onSelectItem={(item: any) => {
              if (!item) return;
              setActiveItem(item);
              const prefill = fmHardwarePrefill(item.product);
              if (Object.keys(prefill).length) {
                setInstallDetail((prev: any) => ({ ...prev, ...prefill }));
                setShowInstallPanel(true);
              }
            }}
            activeItemIndex={activeItem?.index}
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-7 border rounded-md bg-white p-3">
              <label className="text-xs font-medium text-slate-600">Text Entry</label>
              <textarea
                className="w-full border mt-1 text-xs p-2 h-32 resize-none rounded-md"
                value={form.notes || ''}
                onChange={(e) => update('notes', e.target.value)}
              />
            </div>

            <div className="lg:col-span-5 border rounded-md bg-white p-3 text-xs">
              <div className="font-semibold mb-2 text-slate-700">Charges</div>
              <ChargeRow label="Parts" value={parts.toFixed(2)} readOnly />
              <ChargeRow
                label="Sundries"
                value={form.chargeSundries ?? ''}
                onChange={(v) => updateCharges('chargeSundries', v)}
              />
              <ChargeRow
                label="Labour"
                value={form.chargeLabour ?? ''}
                onChange={(v) => updateCharges('chargeLabour', v)}
              />
              <ChargeRow
                label="Freight"
                value={form.chargeFreight ?? ''}
                onChange={(v) => updateCharges('chargeFreight', v)}
              />
              <ChargeRow label="G.S.Tax" value={gst.toFixed(2)} readOnly />
              <ChargeRow
                label="Rounding"
                value={form.chargeRounding ?? ''}
                onChange={(v) => updateCharges('chargeRounding', v)}
              />
              <div className="border-t mt-2 pt-2">
                <ChargeRow label="Total Cost" value={total.toFixed(2)} readOnly bold />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 border rounded-md bg-white p-3 text-xs">
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-medium text-slate-600">User</span>
              <select
                className="border rounded-md p-1.5 min-w-[160px]"
                value={form.assignedUserId || ''}
                onChange={(e) => update('assignedUserId', e.target.value)}
                disabled={isLocked}
              >
                <option value="">Select</option>
                {userOptions.map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {u.displayName || `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="font-medium text-slate-600 shrink-0">Dispatch</span>
              <input
                className="border rounded-md p-1.5 flex-1 min-w-0"
                placeholder="Method"
                value={form.dispatchMethod || ''}
                onChange={(e) => update('dispatchMethod', e.target.value)}
              />
              <input
                className="border rounded-md p-1.5 flex-1 min-w-0"
                placeholder="Reference"
                value={form.dispatchRef || ''}
                onChange={(e) => update('dispatchRef', e.target.value)}
              />
            </div>
          </div>
        </div>

        {showInstallPanel ? (
          <div className="xl:col-span-5 min-w-0 xl:sticky xl:top-4 self-start max-h-[calc(100vh-8rem)] overflow-y-auto border rounded-md bg-white">
            <FMInstallDetailsPanel
              item={{ id: 'header', installDetail: { ...installDetail } }}
              onClose={() => setShowInstallPanel(false)}
              onSave={(data: any) => {
                setInstallDetail(data);
                setForm((p: any) => ({ ...p, installDetail: data }));
              }}
              onSyncType={(type: string) => {
                setForm((p: any) => ({ ...p, type }));
              }}
              fleetName={form.fmFleetName ?? ''}
              fmCustomerId={form.customerId ?? ''}
              fmRecordId={form.fmCustomerId ?? ''}
              fmMixOrgId={form.fmMixOrgId ?? ''}
              invalidFields={invalidFields}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ChargeRow({
  label,
  value,
  readOnly = false,
  bold = false,
  onChange,
}: {
  label: string;
  value: string | number;
  readOnly?: boolean;
  bold?: boolean;
  onChange?: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 mb-1">
      <span className={`w-24 shrink-0 text-slate-600 ${bold ? 'font-semibold' : ''}`}>{label}</span>
      <input
        className={`border rounded-md p-1 text-right w-32 ${bold ? 'font-semibold bg-slate-50' : ''} ${
          readOnly ? 'bg-slate-100 text-slate-500' : ''
        }`}
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </div>
  );
}
