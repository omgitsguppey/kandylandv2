"use client";

import { Candy, Check, Minus, Plus } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export interface KandyWalletPromo {
    shouldShowOnMobile: boolean;
    maxWidthClassName: string;
    label: string;
    compactLabel: string;
}

export interface KandyWalletHeaderProps {
    hasUserProfile: boolean;
    rewardBalanceLabel: string;
    paidBalanceLabel: string;
}

export function KandyWalletHeader({ hasUserProfile, rewardBalanceLabel, paidBalanceLabel }: KandyWalletHeaderProps) {
    return (
        <header className="grid gap-3" data-wallet-mobile-density="compact" data-payment-module-density="compact-v2">
            <div>
                <h2 className="text-xl font-semibold tracking-tight text-foreground">Set your refill</h2>
                <p className="mt-1 text-sm text-muted-foreground">Pick the GumDrops that should arrive after your payment is confirmed.</p>
            </div>
            {hasUserProfile ? (
                <Card
                    className="grid grid-cols-2 gap-0 overflow-hidden py-0 shadow-none"
                    data-wallet-mobile-density="compact"
                    aria-label={"Wallet balance: " + rewardBalanceLabel + " reward GD, " + paidBalanceLabel + " paid GD"}
                >
                    <div className="border-r border-border px-3 py-2">
                        <p className="text-xs text-muted-foreground">Reward balance</p>
                        <p className="mt-1 text-sm font-semibold text-foreground">{rewardBalanceLabel} GD</p>
                    </div>
                    <div className="px-3 py-2">
                        <p className="text-xs text-muted-foreground">Paid balance</p>
                        <p className="mt-1 text-sm font-semibold text-foreground">{paidBalanceLabel} GD</p>
                    </div>
                </Card>
            ) : null}
        </header>
    );
}

export interface KandyWalletPackageOptionProps {
    amount: number;
    label: string;
    price: number;
    promo: KandyWalletPromo | null;
    selected: boolean;
    disabled?: boolean;
    onSelect: () => void;
    ariaLabel?: string;
    children?: ReactNode;
}

function KandyWalletPromoBadge({ promo }: { promo: KandyWalletPromo | null }) {
    if (!promo || !promo.shouldShowOnMobile) {
        return <span aria-hidden="true" className="min-h-5 min-w-20" data-purchase-promo-slot="reserved" />;
    }

    return (
        <Badge
            className={cn("max-w-[7.6rem] text-xs leading-none", promo.maxWidthClassName)}
            data-purchase-promo-slot="reserved"
            title={promo.label}
        >
            {promo.compactLabel}
        </Badge>
    );
}

function KandyWalletPriceBlock({ price, promo }: Pick<KandyWalletPackageOptionProps, "price" | "promo">) {
    return (
        <span className="col-start-2 flex min-w-0 flex-wrap items-center justify-between gap-2" data-purchase-row-zone="price">
            <span className="text-sm font-semibold text-foreground">{"$" + price.toFixed(2)}</span>
            <KandyWalletPromoBadge promo={promo} />
        </span>
    );
}

export function KandyWalletPackageOption({ amount, label, price, promo, selected, disabled, onSelect, ariaLabel, children }: KandyWalletPackageOptionProps) {
    return (
        <div className="border-b border-border last:border-b-0" data-wallet-mobile-density="compact" data-payment-module-density="compact-v2">
            <Button
                type="button"
                variant="ghost"
                onClick={onSelect}
                disabled={disabled}
                aria-pressed={selected}
                aria-label={ariaLabel}
                className={cn(
                    "grid w-full grid-cols-[2.75rem_minmax(0,1fr)] gap-x-3 gap-y-1 rounded-none px-3 py-3 text-left text-foreground",
                    selected && "bg-accent text-accent-foreground",
                )}
            >
                <span className="row-span-2 flex h-11 w-11 items-center justify-center self-center text-primary" data-purchase-row-zone="icon">
                    {selected ? <Check className="h-5 w-5" aria-hidden="true" /> : <Candy className="h-5 w-5" aria-hidden="true" />}
                </span>
                <span className="col-start-2 min-w-0" data-purchase-row-zone="copy">
                    <span className="flex flex-wrap items-baseline gap-x-2">
                        <span className="text-lg font-semibold leading-tight">{amount.toLocaleString()}</span>
                        <span className="text-xs text-muted-foreground">GumDrops</span>
                        {selected ? <span className="sr-only">Selected</span> : null}
                    </span>
                    <span className="mt-0.5 block text-sm font-normal text-muted-foreground">{label}</span>
                </span>
                <KandyWalletPriceBlock price={price} promo={promo} />
            </Button>
            {children}
        </div>
    );
}

export interface KandyWalletBundleStepperProps {
    sizeLabel: string;
    canDecrease: boolean;
    canIncrease: boolean;
    onDecrease: () => void;
    onIncrease: () => void;
}

export function KandyWalletBundleStepper({ sizeLabel, canDecrease, canIncrease, onDecrease, onIncrease }: KandyWalletBundleStepperProps) {
    return (
        <div className="grid gap-2 border-t border-border px-3 py-3">
            <p className="text-sm text-muted-foreground">Build a custom refill · {sizeLabel} delivered</p>
            <div className="flex items-center justify-between gap-3">
                <Button type="button" variant="outline" size="icon" onClick={onDecrease} disabled={!canDecrease} aria-label="Decrease bundle size">
                    <Minus className="h-4 w-4" aria-hidden="true" />
                </Button>
                <span className="text-sm font-semibold text-foreground">{sizeLabel}</span>
                <Button type="button" variant="outline" size="icon" onClick={onIncrease} disabled={!canIncrease} aria-label="Increase bundle size">
                    <Plus className="h-4 w-4" aria-hidden="true" />
                </Button>
            </div>
        </div>
    );
}
