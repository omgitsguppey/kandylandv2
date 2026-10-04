"use client";

import { Plus, Wallet } from "lucide-react";

import { Button } from "@/components/ui/Button";

interface SignedInDashboardHeaderProps {
  gumDropsBalance: number;
  onWalletPress: () => void;
}

export function SignedInDashboardHeader({ gumDropsBalance, onWalletPress }: SignedInDashboardHeaderProps) {
  return (
    <header className="flex min-w-0 flex-wrap items-end justify-between gap-6 py-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Home</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Your collection and daily rewards.</p>
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-4">
        <dl>
          <dt className="text-sm text-muted-foreground">GumDrops</dt>
          <dd className="text-xl font-semibold tabular-nums text-foreground">{gumDropsBalance}</dd>
        </dl>
        <Button variant="brand" onClick={onWalletPress} aria-label="Refill GumDrops" className="min-w-0 gap-2 whitespace-normal">
          <Wallet className="size-4 shrink-0" aria-hidden="true" />
          Refill
          <Plus className="size-4 shrink-0" aria-hidden="true" />
        </Button>
      </div>
    </header>
  );
}
