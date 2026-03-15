export const GUMDROPS_PER_USD = 100
export const PAYPAL_DOMESTIC_PERCENT_FEE = 0.0349
export const PAYPAL_FIXED_FEE_USD = 0.49
export const PAYPAL_INTERNATIONAL_SURCHARGE = 0.015

export interface GumdropEconomics {
  deliveredGumDrops: number
  paidGumDrops: number
  bonusGumDrops: number
  grossRevenueUsd: number
  grossRevenueCents: number
  paypalFeeUsd: number
  paypalFeeCents: number
  netRevenueUsd: number
  netRevenueCents: number
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

interface GumdropEconomicsOptions {
  paypalFeeUsd?: number
  netRevenueUsd?: number
  isInternationalSale?: boolean
}

export function deriveGumdropEconomics(
  deliveredGumDrops: number,
  grossRevenueUsd: number,
  options: GumdropEconomicsOptions = {},
): GumdropEconomics {
  const normalizedDrops = Math.max(0, Math.round(deliveredGumDrops))
  const normalizedRevenueUsd = roundCurrency(Math.max(0, grossRevenueUsd))
  const grossRevenueCents = Math.round(normalizedRevenueUsd * 100)
  const estimatedPaypalFeeUsd = normalizedRevenueUsd > 0
    ? roundCurrency(
      (normalizedRevenueUsd * (PAYPAL_DOMESTIC_PERCENT_FEE + (options.isInternationalSale ? PAYPAL_INTERNATIONAL_SURCHARGE : 0)))
      + PAYPAL_FIXED_FEE_USD,
    )
    : 0
  const paypalFeeUsd = roundCurrency(
    Math.min(
      normalizedRevenueUsd,
      Math.max(0, options.paypalFeeUsd ?? estimatedPaypalFeeUsd),
    ),
  )
  const paypalFeeCents = Math.round(paypalFeeUsd * 100)
  const netRevenueUsd = roundCurrency(Math.max(0, options.netRevenueUsd ?? (normalizedRevenueUsd - paypalFeeUsd)))
  const netRevenueCents = Math.round(netRevenueUsd * 100)
  const paidGumDrops = Math.max(0, Math.round(normalizedRevenueUsd * GUMDROPS_PER_USD))
  const bonusGumDrops = Math.max(0, normalizedDrops - paidGumDrops)
  const retailValueUsd = roundCurrency(normalizedDrops / GUMDROPS_PER_USD)
  const retailValueCents = Math.round(retailValueUsd * 100)
  const bonusValueUsd = roundCurrency(bonusGumDrops / GUMDROPS_PER_USD)
  const bonusValueCents = Math.round(bonusValueUsd * 100)
  const adjustedProfitUsd = roundCurrency(Math.max(0, netRevenueUsd - bonusValueUsd))
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
    paypalFeeUsd,
    paypalFeeCents,
    netRevenueUsd,
    netRevenueCents,
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
