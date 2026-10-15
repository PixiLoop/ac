export type VariableMarginPoint = {
  landedLessThan: number;
};

/** Round a markup factor to the 4 decimal places stored on the tier. */
export function roundFactor(value: number): number {
  return Math.round(value * 10000) / 10000;
}

/**
 * Linear interpolation between "landed less than" breakpoints.
 * Factor = A + (B − A) × (input − A$) / (B$ − A$)
 * Costs on or below the first breakpoint use that factor.
 * Costs on or above the last breakpoint use that factor.
 */
export function interpolateTierFactor<T extends VariableMarginPoint>(
  landedCost: number,
  tiers: T[],
  pick: (tier: T) => number,
): number {
  const sorted = [...tiers]
    .map((tier) => ({ ...tier, landedLessThan: Number(tier.landedLessThan) }))
    .filter((tier) => Number.isFinite(tier.landedLessThan))
    .sort((a, b) => a.landedLessThan - b.landedLessThan);

  if (!sorted.length || !Number.isFinite(landedCost)) return 0;

  const valueOf = (tier: T) => {
    const value = Number(pick(tier));
    return Number.isFinite(value) ? value : 0;
  };

  if (landedCost <= sorted[0].landedLessThan) return roundFactor(valueOf(sorted[0]));

  const last = sorted[sorted.length - 1];
  if (landedCost >= last.landedLessThan) return roundFactor(valueOf(last));

  const upperIndex = sorted.findIndex((tier) => tier.landedLessThan >= landedCost);
  const lower = sorted[upperIndex - 1];
  const upper = sorted[upperIndex];
  const span = upper.landedLessThan - lower.landedLessThan;
  if (span === 0) return roundFactor(valueOf(lower));

  const factor =
    valueOf(lower) +
    (valueOf(upper) - valueOf(lower)) * ((landedCost - lower.landedLessThan) / span);
  return roundFactor(factor);
}

/** Variable group price = landed cost × agent factor × interpolated markup. */
export function variableLayerPrice(landedCost: number, agentFactor: number, markup: number): number {
  return Number((landedCost * agentFactor * markup).toFixed(2));
}
