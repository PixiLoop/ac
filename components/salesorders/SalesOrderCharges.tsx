'use client';

import { useState, useEffect } from 'react';
import { Input } from '../../components/ui/input';
import { calcPartsTotal } from './utils/salesOrderTotals';

/* ---------------- HELPERS ---------------- */

const n = (v: any) => Number(v) || 0;

function Row({
  label,
  value,
  children,
  bold,
}: {
  label: string;
  value?: number | string;
  children?: React.ReactNode;
  bold?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 items-center gap-2">
      <div className={`text-sm ${bold ? 'font-semibold' : ''}`}>
        {label}
      </div>

      <div className="text-right">
        {children ? (
          children
        ) : (
          <span className={bold ? 'font-semibold' : ''}>
            {typeof value === 'string' ? value : `$${n(value).toFixed(2)}`}
          </span>
        )}
      </div>
    </div>
  );
}

function Divider() {
  return <div className="border-t my-2" />;
}

/* ---------------- COMPONENT ---------------- */

export function SalesOrderCharges({
  items,
  freight = 0,
  sundries = 0,
  labour = 0,
  rounding = 0,
  otherCharges = 0,
  update,
  readOnly = false,
  gstExempt = false
}: any) {
  // Local state to handle active typing without overriding inputs mid-keystroke
  const [sundriesInput, setSundriesInput] = useState<string>(String(sundries ?? 0));
  const [labourInput, setLabourInput] = useState<string>(String(labour ?? 0));
  const [otherChargesInput, setOtherChargesInput] = useState<string>(String(otherCharges ?? 0));
  const [roundingInput, setRoundingInput] = useState<string>(String(rounding ?? 0));

  // Keep local inputs synchronized when props change externally
  useEffect(() => { setSundriesInput(String(sundries ?? 0)); }, [sundries]);
  useEffect(() => { setLabourInput(String(labour ?? 0)); }, [labour]);
  useEffect(() => { setOtherChargesInput(String(otherCharges ?? 0)); }, [otherCharges]);
  useEffect(() => { setRoundingInput(String(rounding ?? 0)); }, [rounding]);
  const parts = calcPartsTotal(items);

  const subTotal =
    parts +
    n(sundries) +
    n(labour) +
    n(freight) +
    n(otherCharges);

  const gst = subTotal * (gstExempt ? 0 : 0.1);

  // 1. Calculate unrounded total before rounding adjustment
  const unroundedTotal = subTotal + gst;

  // 2. Round total to the nearest 5 cents (0.05)
  const autoTotal = Math.round(unroundedTotal * 20) / 20;

  // 3. Compute rounding difference (e.g., 83.05 - 83.06 = -0.01)
  const autoRounding = autoTotal - unroundedTotal;

  // Use manual rounding input if passed/edited, otherwise fallback to calculated autoRounding
  const effectiveRounding = rounding !== undefined && rounding !== 0
    ? n(rounding)
    : autoRounding;

  const total = unroundedTotal + effectiveRounding;

  // Helper to format string/number to 2 decimal places onBlur
  const handleBlur = (field: string, rawVal: string, setLocalState: (val: string) => void) => {
    const num = Number(rawVal);
    if (isNaN(num)) {
      setLocalState('0.00');
      update(field, 0);
      return;
    }
    const formatted = num.toFixed(2);
    setLocalState(formatted);
    update(field, Number(formatted));
  };

  return (
    <div className="border rounded-lg bg-white p-4 space-y-2">

      {/* HEADER */}
      <div className="px-2 py-1 border-b">
        <h3 className="text-sm font-semibold">Summary</h3>
      </div>

      <Row label="Parts" value={parts} />

      <Row label="Sundries">
        <Input
          type="number"
          step="any"
          value={sundriesInput}
          onChange={e => {
            setSundriesInput(e.target.value);
            update('sundries', n(e.target.value));
          }}
          onBlur={e => handleBlur('sundries', e.target.value, setSundriesInput)}
          disabled={readOnly}
        />
      </Row>

      <Row label="Labour">
        <Input
          type="number"
          step="any"
          value={labourInput}
          onChange={e => {
            setLabourInput(e.target.value);
            update('labour', n(e.target.value));
          }}
          onBlur={e => handleBlur('labour', e.target.value, setLabourInput)}
          disabled={readOnly}
        />
      </Row>

      <Row label="Freight" value={`$${freight ? Number(freight).toFixed(2) : ""}`} />

      <Row label="Other Charges">
        <Input
          type="number"
          step="any"
          value={otherChargesInput}
          onChange={e => {
            setOtherChargesInput(e.target.value);
            update('otherCharges', n(e.target.value));
          }}
          onBlur={e => handleBlur('otherCharges', e.target.value, setOtherChargesInput)}
          disabled={readOnly}
        />
      </Row>

      <Divider />

      <Row label="GST (10%)" value={!gstExempt ? gst : 'GST Exempt'} />

      <Row
        label="Rounding"
        value={`${effectiveRounding >= 0 ? '$' : '-$'}${Math.abs(effectiveRounding).toFixed(2)}`}
      />

      <Divider />

      <Row label="Total Cost" value={total} bold />
    </div>
  );
}