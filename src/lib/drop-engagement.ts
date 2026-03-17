export function toNonNegativeInteger(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return Math.max(0, Math.floor(numeric));
}

export function getDropViewCount(drop: { totalViews?: unknown; totalClicks?: unknown }) {
  return Math.max(
    toNonNegativeInteger(drop.totalViews),
    toNonNegativeInteger(drop.totalClicks),
  );
}
