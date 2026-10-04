"use client";

import { CheckCircle2 } from "lucide-react";
import type { ReactNode } from "react";

import { Card } from "@/components/creative-tim/ui/card";
import { Button } from "@/components/ui/Button";

export interface KandyWalletSuccessStateProps {
    creditedDrops: number;
    paidDrops: number;
    bonusDrops: number;
    securedPriceLabel: string;
    onUnwrap: () => void;
    onExploreExperiences: () => void;
    reportBugControl: ReactNode;
}

export function KandyWalletSuccessState({ creditedDrops, paidDrops, bonusDrops, securedPriceLabel, onUnwrap, onExploreExperiences, reportBugControl }: KandyWalletSuccessStateProps) {
    return (
        <div className="grid gap-4 text-center" data-wallet-mobile-density="compact" role="status">
            <CheckCircle2 className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
            <div>
                <h3 className="text-2xl font-semibold tracking-tight text-foreground">Your Kandy is ready</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                    <strong className="font-semibold text-foreground">{creditedDrops.toLocaleString()} GumDrops</strong> are now available for your next unwrap.
                </p>
            </div>
            <Card className="gap-0 py-0 text-left shadow-none" aria-label="Purchase delivery summary">
                <dl className="grid divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                    <div className="px-3 py-3">
                        <dt className="text-xs text-muted-foreground">Delivered</dt>
                        <dd className="mt-1 text-lg font-semibold text-foreground">{creditedDrops.toLocaleString()} GD</dd>
                    </div>
                    <div className="px-3 py-3">
                        <dt className="text-xs text-muted-foreground">Paid source</dt>
                        <dd className="mt-1 text-lg font-semibold text-foreground">{paidDrops.toLocaleString()} GD</dd>
                        {bonusDrops > 0 ? <dd className="mt-1 text-xs text-muted-foreground">+{bonusDrops.toLocaleString()} paid bonus GD</dd> : null}
                    </div>
                    <div className="px-3 py-3">
                        <dt className="text-xs text-muted-foreground">Payment</dt>
                        <dd className="mt-1 text-lg font-semibold text-foreground">{securedPriceLabel}</dd>
                        <dd className="mt-1 text-xs text-muted-foreground">Captured securely</dd>
                    </div>
                </dl>
            </Card>
            <div className="grid gap-2">
                <Button type="button" variant="brand" onClick={onUnwrap}>Unwrap now</Button>
                <Button type="button" variant="outline" onClick={onExploreExperiences}>Keep the streak going</Button>
            </div>
            <div className="flex justify-center">{reportBugControl}</div>
        </div>
    );
}
