"use client";

import { Plus, Wallet } from "lucide-react";

import { Card, CardContent } from "@/components/creative-tim/ui/card";

interface SignedInDashboardHeaderProps {
  gumDropsBalance: number;
  collectionCount: number;
  onWalletPress: () => void;
}

export function SignedInDashboardHeader({
  gumDropsBalance,
  collectionCount,
  onWalletPress,
}: SignedInDashboardHeaderProps) {
  return (
    <Card className="relative overflow-hidden rounded-3xl border-white/10 bg-slate-950/80 py-0 text-white shadow-2xl shadow-black/20">
      <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-brand-purple/20 via-fuchsia-500/10 to-transparent" aria-hidden="true" />
      <CardContent className="relative grid gap-6 px-5 py-6 sm:px-7 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="text-sm font-semibold text-brand-purple">Your KandyDrops</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Your collection, in one place.</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
            Check in, revisit what you&apos;ve unwrapped, and keep your next Drop within reach.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[22rem]">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-sm text-slate-400">In your collection</p>
            <p className="mt-1 text-2xl font-semibold text-white">{collectionCount}</p>
          </div>
          <button
            type="button"
            onClick={onWalletPress}
            className="group flex min-h-11 items-center justify-between gap-3 rounded-2xl bg-brand-purple px-4 py-3 text-left text-white shadow-lg shadow-brand-purple/25 transition hover:bg-fuchsia-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            aria-label="Refill GumDrops"
          >
            <span>
              <span className="block text-sm font-medium text-white/80">GumDrops</span>
              <span className="block text-2xl font-semibold">{gumDropsBalance}</span>
            </span>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 transition group-hover:bg-white/20" aria-hidden="true">
              <Wallet className="h-5 w-5" />
              <Plus className="-ml-1 h-3.5 w-3.5" />
            </span>
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
