"use client";

import NextImage from "next/image";
import { Plus, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

export type AccountOverviewState = "loading" | "authenticated" | "guest";

export interface KandyDropsAccountOverviewProps {
  state: AccountOverviewState;
  displayName: string;
  subtitle: string;
  avatarUrl: string | null;
  avatarFallback: string;
  balanceLabel: string;
  onProfilePress: () => void;
  onWalletPress: () => void;
}

export function KandyDropsAccountOverview({
  state,
  displayName,
  subtitle,
  avatarUrl,
  avatarFallback,
  balanceLabel,
  onProfilePress,
  onWalletPress,
}: KandyDropsAccountOverviewProps) {
  if (state === "loading") {
    return (
      <section className="glass-panel rounded-2xl border border-white/10 p-4 md:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="h-11 w-11 animate-pulse rounded-full bg-white/10" />
            <div className="space-y-2">
              <div className="h-4 w-32 animate-pulse rounded bg-white/10" />
              <div className="h-3 w-40 animate-pulse rounded bg-white/5" />
            </div>
          </div>
          <div className="h-10 w-28 animate-pulse rounded-full bg-white/10" />
        </div>
      </section>
    );
  }

  return (
    <section className="glass-panel rounded-2xl border border-white/10 p-4 md:p-5 shadow-xl shadow-black/30">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onProfilePress}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left transition active:scale-[0.99]"
          aria-label="Open profile menu"
        >
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-white/15 bg-white/5">
            {avatarUrl ? (
              <NextImage src={avatarUrl} alt={displayName} fill sizes="44px" className="object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-sm font-bold text-white">
                {avatarFallback}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white md:text-base">{displayName}</p>
            <p className="truncate text-xs text-gray-400">{subtitle}</p>
          </div>
        </button>

        <button
          type="button"
          onClick={onWalletPress}
          className={cn(
            "inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-3.5 text-xs font-bold",
            "border-brand-purple/30 bg-brand-purple/15 text-brand-purple shadow-[0_0_20px_rgba(139,92,246,0.2)]",
            "transition active:scale-95"
          )}
          aria-label="Open wallet"
        >
          <Wallet className="h-3.5 w-3.5" />
          <span className="max-w-[120px] truncate">{balanceLabel}</span>
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </section>
  );
}
