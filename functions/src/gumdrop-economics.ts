export const GUMDROPS_PER_USD = 100

export interface GumdropEconomics {
  deliveredGumDrops: number
  paidGumDrops: number
  bonusGumDrops: number
  grossRevenueUsd: number
  grossRevenueCents: number
  retailValueUsd: number
  retailValueCents: number
  bonusValueUsd: number
  bonusValueCents: number
  adjustedProfitUsd: number
  adjustedProfitCents: number
  discountUsd: number
  discountCents: number
  effectiveUsdPer100Gd: number
  effectiveCentsPer100Gd: number
  effectiveYieldRatio: number
}

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function deriveGumdropEconomics(deliveredGumDrops: number, grossRevenueUsd: number): GumdropEconomics {
  const normalizedDrops = Math.max(0, Math.round(deliveredGumDrops))
  const normalizedRevenueUsd = roundCurrency(Math.max(0, grossRevenueUsd))
  const grossRevenueCents = Math.round(normalizedRevenueUsd * 100)
  const paidGumDrops = Math.max(0, Math.round(normalizedRevenueUsd * GUMDROPS_PER_USD))
  const bonusGumDrops = Math.max(0, normalizedDrops - paidGumDrops)
  const retailValueUsd = roundCurrency(normalizedDrops / GUMDROPS_PER_USD)
  const retailValueCents = Math.round(retailValueUsd * 100)
  const bonusValueUsd = roundCurrency(bonusGumDrops / GUMDROPS_PER_USD)
  const bonusValueCents = Math.round(bonusValueUsd * 100)
  const adjustedProfitUsd = roundCurrency(Math.max(0, normalizedRevenueUsd - bonusValueUsd))
  const adjustedProfitCents = Math.round(adjustedProfitUsd * 100)
  const discountUsd = roundCurrency(Math.max(0, retailValueUsd - normalizedRevenueUsd))
  const discountCents = Math.round(discountUsd * 100)
  const deliveredHundreds = normalizedDrops > 0 ? normalizedDrops / 100 : 0
  const effectiveUsdPer100Gd = deliveredHundreds > 0 ? roundCurrency(normalizedRevenueUsd / deliveredHundreds) : 0
  const effectiveCentsPer100Gd = Math.round(effectiveUsdPer100Gd * 100)
  const effectiveYieldRatio = retailValueUsd > 0 ? Number((normalizedRevenueUsd / retailValueUsd).toFixed(4)) : 0

  return {
    deliveredGumDrops: normalizedDrops,
    paidGumDrops,
    bonusGumDrops,
    grossRevenueUsd: normalizedRevenueUsd,
    grossRevenueCents,
    retailValueUsd,
    retailValueCents,
    bonusValueUsd,
    bonusValueCents,
    adjustedProfitUsd,
    adjustedProfitCents,
    discountUsd,
    discountCents,
    effectiveUsdPer100Gd,
    effectiveCentsPer100Gd,
    effectiveYieldRatio,
  }
}
