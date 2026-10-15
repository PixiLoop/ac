'use client';

import { Input } from '../../ui/input';

function TwoCol({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-2 gap-y-0">{children}</div>;
}
function ThreeCol({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-3 gap-x-2 gap-y-0">{children}</div>;
}
function FourCol({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-4 gap-x-2 gap-y-0">{children}</div>;
}

//function SectionBar({ children }: { children: React.ReactNode }) {
function SectionBar({ children }: { children?: React.ReactNode }) {
  return (
    <div className="text-[10px] font-semibold text-slate-600 bg-slate-200
                    px-1.5 py-0.5 mt-1.5 mb-0.5 -mx-2">
      {children}
    </div>
  );
}

function F({ label, value, onChange, type = 'text', readOnly = false, highlight = false, span2 = false }: any) {
  return (
    <div className={span2 ? 'col-span-2' : ''}>
      <Input
        label={label}
        type={type}
        value={value ?? ''}
        readOnly={readOnly}
        onChange={e => onChange?.(e.target.value)}
        className={`h-6 text-[11px] py-0 px-1.5 rounded-none ${highlight ? 'bg-yellow-100' : ''}`}
      />
    </div>
  );
}

function Sel({ label, value, onChange, options }: any) {
  return (
    <div>
      {label && <div className="text-[10px] font-medium text-slate-700 mb-0.5">{label}</div>}
      <select
        className="w-full h-6 border border-slate-300 text-[11px] px-1 rounded-none bg-white"
        value={value ?? ''}
        onChange={e => onChange?.(e.target.value)}
      >
        {options?.map((o: any) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

export function FMInstallHeaderSection({ value: v = {}, update }: any) {
  return (
    <div className="border bg-white text-[11px] p-2 space-y-0.5">

      <div className="flex items-center gap-2 mb-1">
        <span className="font-bold text-xs text-slate-700 shrink-0">FM Installation</span>
        <input readOnly value={v.installNo ?? ''}
          className="border px-1 h-6 text-[11px] w-14 bg-yellow-50 font-mono" />
        <input readOnly value={v.installNo ?? ''}
          className="border px-1 h-6 text-[11px] w-14 bg-yellow-50 font-mono" />
      </div>

      <TwoCol>
        <F label="Entry Date"   type="date" value={v.entryDate}   onChange={val => update('entryDate', val)} />
        <F label="Install Date" type="date" value={v.installDate} onChange={val => update('installDate', val)} />
      </TwoCol>

      <div className="grid grid-cols-3 gap-x-2">
        <F label="Install Invoice" value={v.installInvoice} onChange={val => update('installInvoice', val)} />
        <Sel label="Author" value={v.author} onChange={val => update('author', val)}
          options={[{ label: '', value: '' }, { label: v.author || 'Select', value: v.author || '' }]} />
        <Sel label="Install By" value={v.installBy} onChange={val => update('installBy', val)}
          options={[{ label: '', value: '' }, { label: v.installBy || 'Select', value: v.installBy || '' }]} />
      </div>

      {/* Pre Install */}
      <F label="Pre Install" value={v.preInstall} onChange={val => update('preInstall', val)} />

      <SectionBar />
      <TwoCol>
        <F label="AAS Customer Num"  value={v.aasCustomerNum}  onChange={val => update('aasCustomerNum', val)} />
        <F label="AAS Customer Name" value={v.aasCustomerName} onChange={val => update('aasCustomerName', val)} />
      </TwoCol>
      <TwoCol>
        <F label="FM Customer Num"   value={v.fmCustomerNum}   onChange={val => update('fmCustomerNum', val)} />
        <F label="FM Customer Name"  value={v.fmCustomerName}  onChange={val => update('fmCustomerName', val)} />
      </TwoCol>
      <TwoCol>
        <F label="MIX Org ID Num"    value={v.mixOrgId}        onChange={val => update('mixOrgId', val)} />
        <F label="MIX Org Name"      value={v.mixOrgName}      onChange={val => update('mixOrgName', val)} />
      </TwoCol>
      <F label="MIX Asset Num" value={v.mixAssetNum} onChange={val => update('mixAssetNum', val)} />

      <SectionBar>Vehicle Make / Model / Year</SectionBar>
      <ThreeCol>
        <F label="Make"  value={v.vehicleMake}  onChange={val => update('vehicleMake', val)} />
        <F label="Model" value={v.vehicleModel} onChange={val => update('vehicleModel', val)} />
        <F label="Year"  value={v.vehicleYear}  onChange={val => update('vehicleYear', val)} />
      </ThreeCol>

      <F label="Base Unit" highlight value={v.baseUnit} onChange={val => update('baseUnit', val)} />

      <FourCol>
        <F label="Rego"   value={v.rego}     onChange={val => update('rego', val)} />
        <F label="FI Num" value={v.fiNumber} onChange={val => update('fiNumber', val)} />
        <F label="Depot"  value={v.depot}    onChange={val => update('depot', val)} />
        <F label="Site"   value={v.site}     onChange={val => update('site', val)} />
      </FourCol>

      <SectionBar />
      <div className="flex items-end gap-2">
        <div className="w-20">
          <F highlight label="Service Number" value={v.serviceNumber} onChange={val => update('serviceNumber', val)} />
        </div>

        <div className="flex-1">
          <div className="text-[10px] font-medium text-slate-700 mb-0.5">FMW Service</div>
          <input value={v.fmwService ?? ''}
            onChange={e => update('fmwService', e.target.value)}
            className="w-full border h-6 px-1.5 text-[11px] bg-yellow-50 font-mono rounded-none" />
        </div>

        {/* MIX CODE with segment display */}
        <div className="shrink-0">
          <div className="text-[10px] font-medium text-slate-700 mb-0.5">MIX CODE</div>
          <div className="border p-1 bg-white min-w-[90px]">
            <div className="text-[8px] text-slate-400 flex gap-1 justify-between px-0.5">
              {['WU','S1','V','VC','C+','S2'].map(s => (
                <span key={s}>{s}</span>
              ))}
            </div>
            <div className="font-mono text-[10px] text-center font-bold text-blue-700">
              {v.mixCodeSegments || '0_0_0_0_0_0'}
            </div>
          </div>
        </div>
      </div>

      {/* FMW Service Current */}
      <TwoCol>
        <div>
          <div className="text-[10px] font-medium text-slate-700 mb-0.5">FMW Service Current</div>
          <input value={v.fmwServiceCurrent ?? ''}
            onChange={e => update('fmwServiceCurrent', e.target.value)}
            className="w-full border h-6 px-1.5 text-[11px] bg-yellow-50 font-mono rounded-none" />
        </div>
        <div /> {/* spacer */}
      </TwoCol>

      <SectionBar />
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Sel label="Current Status" value={v.currentStatus ?? 'ACTIVE'}
            onChange={val => update('currentStatus', val)}
            options={[
              { label: 'Active',          value: 'ACTIVE' },
              { label: 'Decommissioned',  value: 'DECOMMISSIONED' },
            ]} />
        </div>
        <div className="w-28">
          <Input label="Status Date" type="date" value={v.statusDate ?? ''}
            onChange={e => update('statusDate', e.target.value)}
            className="h-6 text-[11px] py-0 px-1.5 rounded-none" />
        </div>
        
        <div className="flex gap-1 items-end">
          {[
            { label: 'Status', key: 'statusCode' },
            { label: 'Log',    key: 'logCode' },
            { label: 'AAS',    key: 'aasCode' },
          ].map(({ label, key }) => (
            <div key={key} className="w-12">
              <div className="text-[9px] text-slate-500">{label}</div>
              <input value={v[key] ?? ''}
                onChange={e => update(key, e.target.value)}
                className="w-full border h-6 px-1 text-[11px] text-center font-mono rounded-none bg-yellow-50" />
            </div>
          ))}
        </div>
      </div>

      {/* Charged toggle */}
      <div className="flex items-center gap-1 mt-0.5">
        <input type="checkbox" className="accent-green-600 w-3.5 h-3.5"
          checked={v.charged ?? false}
          onChange={e => update('charged', e.target.checked)} />
        <span className={`px-3 py-0.5 text-[11px] font-bold rounded-sm
          ${v.charged ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
          {v.charged ? 'Charged' : 'Not Charged'}
        </span>
      </div>

      <SectionBar />
      <TwoCol>
        <F label="Commissioned Date"   type="date" value={v.commissionedDate}   onChange={val => update('commissionedDate', val)} />
        <F label="Decommissioned Date" type="date" value={v.decommissionedDate} onChange={val => update('decommissionedDate', val)} />
      </TwoCol>

      {/* Last Edit Date + Last Edit By (user) + Asset Details */}
      <div className="grid grid-cols-3 gap-x-2 mt-0.5">
        <F label="Last Edit Date" type="date" value={v.lastEditDate} readOnly />
        <F label="Last Edit By"              value={v.lastEditBy}    readOnly highlight />
        <F label="Asset Details"             value={v.assetDetails}  onChange={val => update('assetDetails', val)} />
      </div>

    </div>
  );
}