export function printLineDescription(item: any): string {
  const base = String(item?.description ?? item?.partNumber ?? item?.product?.name ?? '').trim();
  const isBog =
    !!item?.billOfGoods ||
    !!item?.product?.billOfGoods ||
    /\(BoG\)\s*$/i.test(base);
  if (!isBog) return base || '—';
  if (/\(BoG\)\s*$/i.test(base)) return base;
  return base ? `${base} (BoG)` : '(BoG)';
}
