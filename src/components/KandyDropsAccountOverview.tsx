"use client";

import NextImage from "next/image";
import { Plus, Wallet } from "lucide-react";

import { Card, CardContent } from "@/components/creative-tim/ui/card";
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
      <Card className="rounded-3xl border-white/10 bg-slate-950/80 py-0 shadow-xl shadow-black/20">
        <CardContent className="flex items-center justify-between gap-3 px-4 py-4 md:px-5 md:py-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="h-11 w-11 animate-pulse rounded-full bg-white/10" />
            <div className="space-y-2">
              <div className="h-4 w-32 animate-pulse rounded bg-white/10" />
              <div className="h-3 w-40 animate-pulse rounded bg-white/5" />
            </div>
          </div>
          <div className="h-11 w-28 animate-pulse rounded-2xl bg-white/10" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-3xl border-white/10 bg-slate-950/80 py-0 text-white shadow-xl shadow-black/20">
      <CardContent className="flex items-center justify-between gap-3 px-4 py-4 md:px-5 md:py-5">
        <button
          type="button"
          onClick={onProfilePress}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-2xl text-left transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple/75"
          aria-label="Open profile menu"
        >
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-2xl border border-brand-purple/30 bg-brand-purple/10">
            {avatarUrl ? (
              <NextImage src={avatarUrl} alt={displayName} fill sizes="44px" className="object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-white">
                {avatarFallback}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white md:text-base">{displayName}</p>
            <p className="truncate text-sm text-slate-400">{subtitle}</p>
          </div>
        </button>

        <button
          type="button"
          onClick={onWalletPress}
          className={cn(
            "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-2xl bg-brand-purple px-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-purple/25",
            "transition hover:bg-fuchsia-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
          )}
          aria-label="Open wallet"
        >
          <Wallet className="h-4 w-4" />
          <span className="max-w-32 truncate">{balanceLabel}</span>
          <Plus className="h-4 w-4" />
        </button>
      </CardContent>
    </Card>
  );
}
