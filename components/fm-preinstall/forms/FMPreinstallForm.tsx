'use client';

import { useState, useEffect } from 'react';

import { api } from '../../../lib/api-client';
import { useAuth } from '../../../providers/auth-provider';
import { FMPreinstallDetailsSection } from '../../../components/fm-preinstall/sections/FMPreinstallDetailsSection';
import { FMPreinstallItemsSection } from '../../../components/fm-preinstall/sections/FMPreinstallItemsSection';
import { FMInstallDetailsPanel } from '../../../components/fm-preinstall/sections/FMInstallDetailsPanel';
import { ShippingDetailsSection } from '../../../components/salesorders/sections/ShippingDetailsSection';
import { AccountDetailsSection } from '../../../components/salesorders/sections/AccountDetailsSection';

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
}: any) {

  const { user } = useAuth();
  const [userOptions, setUserOptions] = useState<any[]>(Array.isArray(users) ? users : []);
  const [showInstallPanel, setShowInstallPanel] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    api.get('/users', { params: { take: 200, sortKey: 'user', sortDir: 'asc' } })
      .then(res => {
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
    setUserOptions(prev => {
      if (prev.some((u: any) => u.id === user.id)) return prev;
      const label = user.displayName || `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email;
      return [{ id: user.id, displayName: label }, ...prev];
    });
  }, [user, userOptions]);

  // Default to the person filling in the form when nothing is saved yet.
  useEffect(() => {
    if (!user?.id) return;
    setForm((prev: any) => {
      if (prev?.assignedUserId) return prev;
      return { ...prev, assignedUserId: user.id };
    });
  }, [user?.id, setForm]);

  //const update        = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));
  const update = (k: string, v: any) => {
    setForm((p: any) => {
      const next = { ...p, [k]: v };

      // Type ↔ installType sync
      if (k === 'type') {
        next.installType = v;
        // installDetail sync
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

  // FIX 1: ShippingDetailsSection reads value.shippingName and calls update('shippingName',...)
  // Our shipping state uses 'name' — so map shippingName <-> name
  const updateShipping = (k: string, v: any) => {
    const mapped = k === 'shippingName' ? 'name' : k;
    setShipping((prev: any) => ({ ...prev, [mapped]: v }));
  };

  // FIX 1: AccountDetailsSection reads value.billingName and calls update('shippingName',...)
  // (bug in component — it uses shippingName key for Name field)
  // Our account state uses 'name' — map both shippingName and billingName -> name
  const updateAccount = (k: string, v: any) => {
    const mapped = (k === 'shippingName' || k === 'billingName') ? 'name' : k;
    setAccount((prev: any) => ({ ...prev, [mapped]: v }));
  };

  const updateInstall = (k: string, v: any) =>
    setInstallDetail((prev: any) => ({ ...prev, [k]: v }));

  useEffect(() => {
    setShowInstallPanel(false);
    setActiveItem(null);
    setIsInitialized(true);
  }, []);

  // Derived charges from items
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

  const isRightOpen = isInitialized && showInstallPanel;
  if (!isInitialized) return null;

  return (
    <div className="grid grid-cols-12 gap-4 h-[calc(100vh-140px)]">

      {/* LEFT PANEL */}
      <div className={`${isRightOpen ? 'lg:col-span-6' : 'lg:col-span-12'} col-span-12 flex flex-col`}>
        <div className="overflow-y-auto pr-2 space-y-4 h-full">

          {/* TOP SECTIONS */}
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 lg:col-span-5">
              <FMPreinstallDetailsSection
                value={{
                  ...form,
                  // installDetail
                  installLocation: form.installLocation ?? installDetail?.installLocation ?? '',
                  installer: form.installer ?? installDetail?.installer ?? '',
                  installDate: form.installDate ?? installDetail?.installDate ?? '',
                }}
                update={update}
                setItems={setItems}
                setShipping={setShipping}
                setAccount={setAccount}
                setInstallDetail={setInstallDetail}  // NEW prop
                disabled={isLocked}
              />
            </div>

            {/* FIX 2: ShippingDetailsSection reads value.shippingName
                Our shipping state stores it as 'name' — spread with correct key */}
            <div className="col-span-12 lg:col-span-4">
              <ShippingDetailsSection
                value={{ ...shipping, shippingName: shipping.name }}
                update={updateShipping}
              />
            </div>

            {/* FIX 2: AccountDetailsSection reads value.billingName
                Our account state stores it as 'name' — spread with correct key */}
            <div className="col-span-12 lg:col-span-3">
              <AccountDetailsSection
                value={{ ...account, billingName: account.name }}
                update={updateAccount}
              />
            </div>
          </div>

          {/* INSTALL DETAILS BUTTON */}
          <div className="flex justify-end">
            <button
              className="bg-blue-600 text-white px-3 py-1 rounded text-xs"
              onClick={() => { setShowInstallPanel(true); setActiveItem(null); }}
            >
              Install Type
            </button>
          </div>

          {/* ITEM ENTRY */}
          <FMPreinstallItemsSection
            items={items}
            setItems={setItems}
            onSelectItem={(item: any) => {
              if (!item) return;
              setActiveItem(item);
              setShowInstallPanel(false);
            }}
            activeItemIndex={activeItem?.index}
          />

          {/* TEXT ENTRY + CHARGES */}
          <div className="grid grid-cols-12 gap-4">

            <div className="col-span-12 lg:col-span-7 border p-2">
              <label className="text-xs font-medium text-slate-600">Text Entry</label>
              <textarea
                className="w-full border mt-1 text-xs p-1 h-32 resize-none"
                value={form.notes || ''}
                onChange={e => update('notes', e.target.value)}
              />
            </div>

            <div className="col-span-12 lg:col-span-5 border p-2 text-xs">
              <div className="font-semibold mb-1 text-slate-700">Charges</div>
              <ChargeRow label="Parts" value={parts.toFixed(2)} readOnly />
              <ChargeRow label="Sundries"
                value={form.chargeSundries ?? ''}
                onChange={v => updateCharges('chargeSundries', v)} />
              <ChargeRow label="Labour"
                value={form.chargeLabour ?? ''}
                onChange={v => updateCharges('chargeLabour', v)} />
              <ChargeRow label="Freight"
                value={form.chargeFreight ?? ''}
                onChange={v => updateCharges('chargeFreight', v)} />
              <ChargeRow label="G.S.Tax" value={gst.toFixed(2)} readOnly />
              <ChargeRow label="Rounding"
                value={form.chargeRounding ?? ''}
                onChange={v => updateCharges('chargeRounding', v)} />
              <div className="border-t mt-1 pt-1">
                <ChargeRow label="Total Cost" value={total.toFixed(2)} readOnly bold />
              </div>
            </div>

          </div>

          {/* USER + DISPATCH */}
          <div className="flex items-center gap-4 border p-2 text-xs">

            <div className="flex items-center gap-2 shrink-0">
              <span className="font-medium text-slate-600">User</span>
              <select
                className="border p-1 min-w-[160px]"
                value={form.assignedUserId || ''}
                onChange={e => update('assignedUserId', e.target.value)}
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

            <div className="flex items-center gap-2 flex-1">
              <span className="font-medium text-slate-600 shrink-0">Dispatch</span>
              <span className="border w-5 h-5 bg-yellow-200 inline-block shrink-0" />
              <input
                className="border p-1 flex-1"
                placeholder="Method"
                value={form.dispatchMethod || ''}
                onChange={e => update('dispatchMethod', e.target.value)}
              />
              <input
                className="border p-1 flex-1"
                placeholder="Reference"
                value={form.dispatchRef || ''}
                onChange={e => update('dispatchRef', e.target.value)}
              />
            </div>

          </div>

        </div>
      </div>

      {/* RIGHT PANEL */}
      {showInstallPanel && (
        <div className="col-span-12 lg:col-span-6 h-full">
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
            updateInstall={updateInstall}
            fleetName={form.fmFleetName ?? ''}
            fmCustomerId={form.customerId ?? ''}
          />
        </div>
      )}

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
    <div className="flex items-center justify-between gap-2 mb-0.5">
      <span className={`w-20 shrink-0 text-slate-600 ${bold ? 'font-semibold' : ''}`}>{label}</span>
      <input
        className={`border p-0.5 text-right w-28 ${bold ? 'font-semibold bg-slate-50' : ''} ${readOnly ? 'bg-slate-100 text-slate-500' : ''}`}
        value={value}
        readOnly={readOnly}
        onChange={e => onChange?.(e.target.value)}
      />
    </div>
  );
}
