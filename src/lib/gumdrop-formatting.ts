import { readSourceAwareBalance } from "@/lib/gumdrop-ledger";

export type WalletBalanceSourceFields = {
  gumDropsBalance?: unknown;
  gumDropsPurchasedBalance?: unknown;
  gumDropsRewardBalance?: unknown;
};

function normalizeCompactInput(value: unknown) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return Math.max(0, Math.round(numeric));
}

export function formatCompactGd(value: unknown) {
  const normalized = normalizeCompactInput(value);

  if (normalized < 1000) {
    return String(normalized);
  }

  const thousands = normalized / 1000;
  if (normalized >= 10000) {
    return `${Math.round(thousands)}k`;
  }

  const oneDecimalThousands = Math.round(thousands * 10) / 10;
  if (Number.isInteger(oneDecimalThousands)) {
    return `${Math.trunc(oneDecimalThousands)}k`;
  }

  return `${oneDecimalThousands.toFixed(1)}k`;
}

export function resolveWalletBalanceSplit(profile: WalletBalanceSourceFields | null | undefined) {
  const sourceBalance = readSourceAwareBalance({
    gumDropsBalance: profile?.gumDropsBalance,
    gumDropsPurchasedBalance: profile?.gumDropsPurchasedBalance,
    gumDropsRewardBalance: profile?.gumDropsRewardBalance,
  });

  return {
    freeGd: sourceBalance.reward,
    paidGd: sourceBalance.purchased,
    totalGd: sourceBalance.total,
  };
}
