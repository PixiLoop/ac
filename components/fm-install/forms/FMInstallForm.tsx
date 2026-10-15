'use client';

import { FMInstallHeaderSection } from '../sections/FMInstallHeaderSection';
import { FMInstallDetailsPanel }  from '../sections/FMInstallDetailsPanel';

export function FMInstallForm({ form, setForm }: any) {
  const update = (k: string, v: any) =>
    setForm((p: any) => ({ ...p, [k]: v }));

  const updateDetail = (k: string, v: any) =>
    setForm((p: any) => ({
      ...p,
      installDetail: { ...(p.installDetail ?? {}), [k]: v },
    }));

  return (
    // Single page scroll — no per-column overflow, columns just grow naturally
    <div className="grid grid-cols-12 gap-3">
      <div className="col-span-12 lg:col-span-6">
        <FMInstallHeaderSection value={form} update={update} />
      </div>
      <div className="col-span-12 lg:col-span-6">
        <FMInstallDetailsPanel
          form={form.installDetail ?? {}}
          update={updateDetail}
          onSave={(data: any) =>
            setForm((p: any) => ({ ...p, installDetail: data }))
          }
        />
      </div>
    </div>
  );
}