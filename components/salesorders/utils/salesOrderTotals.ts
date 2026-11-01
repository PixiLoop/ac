import { calcLineTotal } from './salesOrderCalc';

export function calcPartsTotal(items: any[]) {
  return items.reduce((sum, i) => sum + calcLineTotal({
    ...i,
    qty: i.qty || i.quantity || 0,
    unitPrice: i.unitPrice || i.rate || 0,
  }), 0);
}

export function round(n: number) {
  return Math.round(n * 100) / 100;
}
