'use client';

import { useState, useEffect } from 'react';
import { Input } from '../../ui/input';

function TwoCol({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">{children}</div>;
}

function ThreeCol({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-3 gap-x-3 gap-y-0.5">{children}</div>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-semibold text-slate-600 bg-slate-100
                    px-1.5 py-0.5 mb-1 mt-2 -mx-2 flex items-center gap-1">
      {children}
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-purple-200 text-[9px] px-1 rounded font-mono shrink-0">{children}</span>
  );
}

// Thin wrapper that always renders compact
function F({ label, value, onChange, readOnly = false, highlight = false, type = 'text' }: any) {
  return (
    <Input
      label={label}
      type={type}
      value={value ?? ''}
      readOnly={readOnly}
      onChange={e => onChange?.(e.target.value)}
      className={`h-7 text-xs py-0 px-2 ${highlight ? 'bg-yellow-50' : ''}`}
    />
  );
}

// Native checkbox styled consistently
function Chk({ label, checked, onChange, yellow = false }: any) {
  return (
    <label className="flex items-center gap-1 text-[10px] cursor-pointer select-none">
      <input type="checkbox" className="accent-blue-600 w-3.5 h-3.5"
        checked={checked ?? false}
        onChange={e => onChange(e.target.checked)} />
      <span className={yellow ? 'bg-yellow-100 px-1 rounded' : ''}>{label}</span>
    </label>
  );
}

export function FMInstallDetailsPanel({ form, update }: any) {
  const [local, setLocal] = useState<any>(form ?? {});

  useEffect(() => { setLocal(form ?? {}); }, [form]);

  const set = (k: string, v: any) => {
    setLocal((p: any) => ({ ...p, [k]: v }));
    update?.(k, v);
  };

  return (
    <div className="border bg-white text-xs p-2">

      {/* ── AAI BASE UNIT ────────────────────────────────────────── */}
      <SectionTitle>AAI Base Unit</SectionTitle>

      <TwoCol>
        <F label="AAI Base Unit Code" value={local.baseUnitCode} onChange={v => set('baseUnitCode', v)} />
        <F label="AAI Base Unit Name" value={local.baseUnitName} onChange={v => set('baseUnitName', v)} />
      </TwoCol>

      <div className="flex gap-4 my-1">
        <Chk label="4G Modem"
          checked={local.modem4G}
          onChange={v => set('modem4G', v)} />
        <Chk label="Tacho_Data (TD)" yellow
          checked={local.tachoData}
          onChange={v => set('tachoData', v)} />
      </div>

      <ThreeCol>
        <F label="Unit Type"            value={local.unitType}  onChange={v => set('unitType', v)} />
        <F label="Unit Model"           value={local.unitModel} onChange={v => set('unitModel', v)} />
        <F label="MU - Mix Charge Code" value={local.muCode}    onChange={v => set('muCode', v)} />
      </ThreeCol>

      <ThreeCol>
        <F highlight label="Unit SerialNum"         value={local.unitSerial}    onChange={v => set('unitSerial', v)} />
        <F highlight label="Unit IMEI"              value={local.unitIMEI}      onChange={v => set('unitIMEI', v)} />
        <F highlight label="Unit Sim Serial Number" value={local.unitSimSerial} onChange={v => set('unitSimSerial', v)} />
      </ThreeCol>

      {/* ── MIX UNIT SIM S1 ─────────────────────────────────────── */}
      <SectionTitle>MIX Unit Simm <Tag>S1</Tag></SectionTitle>

      <div className="flex gap-4 mb-1">
        <Chk label="Enable SIM1"  checked={local.mixSim1}      onChange={v => set('mixSim1', v)} />
        <Chk label="International" checked={local.international} onChange={v => set('international', v)} />
      </div>

      <TwoCol>
        <F label="SIM Type" value={local.sim1Type} onChange={v => set('sim1Type', v)} />
        <F label="SIM Code" value={local.sim1Code} onChange={v => set('sim1Code', v)} />
      </TwoCol>

      {/* ── VISION ──────────────────────────────────────────────── */}
      <SectionTitle>Vision <Tag>V</Tag></SectionTitle>

      <TwoCol>
        <F label="AAI Camera Type" value={local.cameraType}    onChange={v => set('cameraType', v)} />
        <div>
          <div className="text-[10px] text-slate-500 flex items-center gap-1 mb-0.5">
            Mix Vision Code <Tag>VO</Tag>
          </div>
          <Input value={local.mixVisionCode ?? ''}
            onChange={e => set('mixVisionCode', e.target.value)}
            className="h-7 text-xs py-0 px-2" />
        </div>
      </TwoCol>

      <div className="flex gap-3 my-1 flex-wrap">
        {[
          { label: 'Standard',    key: 'standard' },
          { label: 'High Def',    key: 'highDef' },
          { label: 'AI Option',   key: 'aiOption' },
          { label: 'M1N Hardware',key: 'm1n' },
        ].map(({ label, key }) => (
          <Chk key={key} label={label} checked={local[key]} onChange={v => set(key, v)} />
        ))}
      </div>

      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] text-slate-500 shrink-0">Cameras</span>
        <Input type="number" min={0}
          value={local.cameraCount ?? ''}
          onChange={e => set('cameraCount', e.target.value)}
          className="h-7 text-xs py-0 px-2 w-16" />
      </div>

      <TwoCol>
        <div>
          <div className="text-[10px] text-slate-500 flex items-center gap-1 mb-0.5">Base VO <Tag>VO</Tag></div>
          <Input value={local.baseVO ?? ''} onChange={e => set('baseVO', e.target.value)}
            className="h-7 text-xs py-0 px-2" />
        </div>
        <div>
          <div className="text-[10px] text-slate-500 flex items-center gap-1 mb-0.5">Added C+ <Tag>C+</Tag></div>
          <Input value={local.addedC ?? ''} onChange={e => set('addedC', e.target.value)}
            className="h-7 text-xs py-0 px-2" />
        </div>
      </TwoCol>

      <ThreeCol>
        <F highlight label="Vis SerialNum"  value={local.visSerial} onChange={v => set('visSerial', v)} />
        <F highlight label="Vis IMEI"       value={local.visIMEI}   onChange={v => set('visIMEI', v)} />
        <F highlight label="S2 Serial"      value={local.s2Serial}  onChange={v => set('s2Serial', v)} />
        <F highlight label="Cam3 SerialNum" value={local.cam3}      onChange={v => set('cam3', v)} />
        <F highlight label="Cam4 SerialNum" value={local.cam4}      onChange={v => set('cam4', v)} />
        <F highlight label="Cam5 SerialNum" value={local.cam5}      onChange={v => set('cam5', v)} />
      </ThreeCol>

      {/* ── MIX VISION SIM S2 ───────────────────────────────────── */}
      <SectionTitle>MIX Vision Simm <Tag>S2</Tag></SectionTitle>

      <Chk label="Enable SIM2" checked={local.mixSim2} onChange={v => set('mixSim2', v)} />

      <TwoCol>
        <F label="Sim Type" value={local.sim2Type} onChange={v => set('sim2Type', v)} />
        <F label="SIM Code" value={local.sim2Code} onChange={v => set('sim2Code', v)} />
      </TwoCol>

      {/* ── OPTIONS ─────────────────────────────────────────────── */}
      <SectionTitle>Options</SectionTitle>
      <div className="flex gap-4 flex-wrap">
        <Chk yellow label="AI_Option (AI)" checked={local.ai}  onChange={v => set('ai', v)} />
        <Chk yellow label="TMA_Option"     checked={local.tma} onChange={v => set('tma', v)} />
        <Chk yellow label="RIM_Option"     checked={local.rim} onChange={v => set('rim', v)} />
      </div>

      {/* ── RESULT CODES ────────────────────────────────────────── */}
      <div className="border-t mt-2 pt-1 flex gap-4 text-[10px]">
        <div>
          <span className="text-slate-500">MIX Code: </span>
          <span className="font-mono font-semibold text-blue-700">{local.mixCode || '-'}</span>
        </div>
        <div>
          <span className="text-slate-500">Service Code: </span>
          <span className="font-mono font-semibold text-cyan-700">{local.serviceCode || '-'}</span>
        </div>
      </div>

    </div>
  );
}