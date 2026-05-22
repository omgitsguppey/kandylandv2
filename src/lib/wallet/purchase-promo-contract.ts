export type PurchasePromoKind =
  | "bonus"
  | "sale"
  | "discount"
  | "subscription"
  | "best_value"
  | "limited"
  | "starter";

export type PurchasePromoTone = "brand" | "value" | "urgent" | "neutral";

export type PurchasePromoOffer = {
  kind: PurchasePromoKind;
  label: string;
  compactLabel: string;
  tone: PurchasePromoTone;
  priority: number;
  shouldShowOnMobile: boolean;
  maxWidthClassName: string;
};

export const PURCHASE_PROMO_MAX_WIDTH_CLASS = "max-w-[6.4rem]" as const;

export const PURCHASE_PROMO_KIND_DEFAULTS: Record<PurchasePromoKind, Omit<PurchasePromoOffer, "label" | "compactLabel">> = {
  bonus: {
    kind: "bonus",
    tone: "brand",
    priority: 50,
    shouldShowOnMobile: true,
    maxWidthClassName: PURCHASE_PROMO_MAX_WIDTH_CLASS,
  },
  sale: {
    kind: "sale",
    tone: "value",
    priority: 60,
    shouldShowOnMobile: true,
    maxWidthClassName: PURCHASE_PROMO_MAX_WIDTH_CLASS,
  },
  discount: {
    kind: "discount",
    tone: "value",
    priority: 65,
    shouldShowOnMobile: true,
    maxWidthClassName: PURCHASE_PROMO_MAX_WIDTH_CLASS,
  },
  subscription: {
    kind: "subscription",
    tone: "neutral",
    priority: 40,
    shouldShowOnMobile: true,
    maxWidthClassName: PURCHASE_PROMO_MAX_WIDTH_CLASS,
  },
  best_value: {
    kind: "best_value",
    tone: "brand",
    priority: 70,
    shouldShowOnMobile: true,
    maxWidthClassName: PURCHASE_PROMO_MAX_WIDTH_CLASS,
  },
  limited: {
    kind: "limited",
    tone: "urgent",
    priority: 80,
    shouldShowOnMobile: true,
    maxWidthClassName: PURCHASE_PROMO_MAX_WIDTH_CLASS,
  },
  starter: {
    kind: "starter",
    tone: "neutral",
    priority: 30,
    shouldShowOnMobile: true,
    maxWidthClassName: PURCHASE_PROMO_MAX_WIDTH_CLASS,
  },
};

export function buildPurchasePromoOffer(
  kind: PurchasePromoKind,
  label: string,
  compactLabel = label,
): PurchasePromoOffer {
  return {
    ...PURCHASE_PROMO_KIND_DEFAULTS[kind],
    label,
    compactLabel,
  };
}

export function resolvePurchaseBonusPromoOffer(bonusGumDrops: number): PurchasePromoOffer | null {
  if (bonusGumDrops <= 0) {
    return null;
  }

  return buildPurchasePromoOffer("bonus", `+${bonusGumDrops} bonus GD`);
}

export function resolveBundlePromoOffer(hasBundleBonus: boolean): PurchasePromoOffer | null {
  if (!hasBundleBonus) {
    return null;
  }

  return buildPurchasePromoOffer("bonus", "2x bonus GD");
}
