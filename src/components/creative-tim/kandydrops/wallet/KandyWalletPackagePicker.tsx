"use client";

import { Candy, Minus, Plus } from "lucide-react";
import type { ReactNode } from "react";

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

export function KandyWalletHeader({
    hasUserProfile,
    rewardBalanceLabel,
    paidBalanceLabel,
}: KandyWalletHeaderProps) {
    return (
        <header className="relative grid gap-3" data-wallet-mobile-density="compact" data-payment-module-density="compact-v2">
            <div className="flex items-start gap-3.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.2rem] border border-white/30 bg-[linear-gradient(145deg,#f9a8d4,#d8b4fe_52%,#818cf8)] shadow-[0_14px_30px_rgba(236,72,153,0.28)]">
                    <Candy className="h-5 w-5 text-white drop-shadow-md" />
                </div>
                <div className="min-w-0 pt-0.5">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-pink-100/78">01 / Choose delivered amount</p>
                    <h2 id="purchase-wallet-title" className="mt-1 text-[1.65rem] font-black leading-none tracking-tight text-white">Set your refill</h2>
                    <p className="mt-2 max-w-md text-sm leading-5 text-violet-100/75">Pick the GumDrops that should arrive after your payment is confirmed.</p>
                </div>
            </div>
            {hasUserProfile ? (
                <div
                    className="grid grid-cols-2 overflow-hidden rounded-[1.15rem] border border-white/15 bg-slate-950/30 shadow-inner shadow-white/5"
                    data-wallet-mobile-density="compact"
                    aria-label={"Wallet balance: " + rewardBalanceLabel + " reward GD, " + paidBalanceLabel + " paid GD"}
                >
                    <div className="border-r border-white/12 px-3 py-2.5">
                        <p className="text-[9px] font-black uppercase tracking-[0.15em] text-violet-100/48">Reward balance</p>
                        <p className="mt-1 text-sm font-black text-white">{rewardBalanceLabel} GD</p>
                    </div>
                    <div className="px-3 py-2.5">
                        <p className="text-[9px] font-black uppercase tracking-[0.15em] text-pink-100/62">Paid balance</p>
                        <p className="mt-1 text-sm font-black text-white">{paidBalanceLabel} GD</p>
                    </div>
                </div>
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
    onSelect: () => void;
    ariaLabel?: string;
    children?: ReactNode;
}

function KandyWalletPromoBadge({ promo }: { promo: KandyWalletPromo | null }) {
    if (!promo || !promo.shouldShowOnMobile) {
        return (
            <span
                aria-hidden="true"
                className="block h-[1.05rem] min-w-[4.8rem]"
                data-purchase-promo-slot="reserved"
            />
        );
    }

    return (
        <span
            className={cn(
                "inline-flex h-[1.05rem] max-w-[7.6rem] items-center justify-center overflow-hidden text-ellipsis whitespace-nowrap rounded-md border border-fuchsia-200/35 bg-fuchsia-300/20 px-1.5 text-[8px] font-black leading-none tracking-normal text-fuchsia-50",
                promo.maxWidthClassName,
            )}
            data-purchase-promo-slot="reserved"
            title={promo.label}
        >
            {promo.compactLabel}
        </span>
    );
}

function KandyWalletPriceBlock({ price, promo, selected }: Pick<KandyWalletPackageOptionProps, "price" | "promo" | "selected">) {
    return (
        <div className="col-start-2 row-start-2 flex min-w-0 items-center justify-between gap-2" data-purchase-row-zone="price">
            <span className={cn("shrink-0 text-lg font-black leading-none", selected ? "text-pink-100" : "text-white")}>
                {"$" + price.toFixed(2)}
            </span>
            <KandyWalletPromoBadge promo={promo} />
        </div>
    );
}

export function KandyWalletPackageOption({
    amount,
    label,
    price,
    promo,
    selected,
    onSelect,
    ariaLabel,
    children,
}: KandyWalletPackageOptionProps) {
    const className = cn(
        "relative grid min-h-[8rem] w-full grid-cols-[2.75rem_minmax(0,1fr)] grid-rows-[auto_auto] gap-x-3 gap-y-2 rounded-[1.55rem] border p-3.5 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-100/75",
        selected
            ? "border-pink-200/55 bg-[linear-gradient(135deg,rgba(236,72,153,0.3),rgba(167,139,250,0.28))] shadow-[0_18px_34px_rgba(76,34,137,0.34)] ring-1 ring-fuchsia-100/20"
            : "border-white/12 bg-white/[0.065] hover:border-pink-100/35 hover:bg-white/[0.12] cursor-pointer",
    );
    const cardContent = (
        <>
            <div
                className={cn(
                    "row-span-2 flex h-11 w-11 shrink-0 items-center justify-center self-center rounded-[1rem] transition-colors",
                    selected ? "bg-white/20 shadow-inner shadow-white/10" : "bg-white/10",
                )}
                data-purchase-row-zone="icon"
            >
                <Candy className="h-5 w-5 text-pink-100" />
            </div>
            <div className="col-start-2 row-start-1 min-w-0 self-end" data-purchase-row-zone="copy">
                <div className="flex min-w-0 items-baseline gap-1.5">
                    <span className="truncate text-[1.45rem] font-black leading-none tracking-tight text-white">{amount.toLocaleString()}</span>
                    <span className="shrink-0 text-[9px] font-black uppercase tracking-[0.12em] text-violet-100/62">Paid GD</span>
                </div>
                <p className="mt-1 truncate text-[11px] font-medium leading-tight text-violet-100/72">{label}</p>
            </div>
            <KandyWalletPriceBlock price={price} promo={promo} selected={selected} />
            {selected ? (
                <span className="absolute right-3.5 top-3.5 rounded-full border border-pink-100/30 bg-pink-200/15 px-2 py-1 text-[8px] font-black uppercase tracking-[0.14em] text-pink-50">Selected</span>
            ) : null}
        </>
    );

    if (children) {
        return (
            <div
                data-wallet-mobile-density="compact"
                data-payment-module-density="compact-v2"
                className={cn(className, "focus-within:ring-2 focus-within:ring-pink-100/75")}
            >
                <button
                    type="button"
                    onClick={onSelect}
                    aria-pressed={selected}
                    aria-label={ariaLabel}
                    className="col-span-2 grid min-h-11 w-full grid-cols-[2.75rem_minmax(0,1fr)] grid-rows-[auto_auto] gap-x-3 gap-y-2 text-left focus-visible:outline-none"
                >
                    {cardContent}
                </button>
                {children}
            </div>
        );
    }

    return (
        <button
            type="button"
            onClick={onSelect}
            aria-pressed={selected}
            aria-label={ariaLabel}
            data-wallet-mobile-density="compact"
            data-payment-module-density="compact-v2"
            className={className}
        >
            {cardContent}
        </button>
    );
}

export interface KandyWalletBundleStepperProps {
    sizeLabel: string;
    canDecrease: boolean;
    canIncrease: boolean;
    onDecrease: () => void;
    onIncrease: () => void;
}

export function KandyWalletBundleStepper({
    sizeLabel,
    canDecrease,
    canIncrease,
    onDecrease,
    onIncrease,
}: KandyWalletBundleStepperProps) {
    return (
        <div className="col-span-2 mt-1 grid gap-2 border-t border-white/15 pt-3">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-violet-100/58">Build a custom refill</p>
                    <p className="mt-0.5 text-xs font-bold text-white">{sizeLabel} delivered</p>
                </div>
                <div className="flex w-[142px] shrink-0 items-center justify-between rounded-xl border border-white/15 bg-slate-950/35 p-0.5 shadow-inner shadow-white/10">
                    <button
                        aria-label="Decrease bundle size"
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            onDecrease();
                        }}
                        disabled={!canDecrease}
                        className={cn(
                            "flex h-11 w-11 items-center justify-center rounded-lg text-white transition-colors",
                            !canDecrease ? "cursor-not-allowed bg-transparent opacity-30" : "bg-white/10 hover:bg-white/20",
                        )}
                    >
                        <Minus className="h-4 w-4" />
                    </button>
                    <div className="px-1 text-center text-[11px] font-black text-white">{sizeLabel}</div>
                    <button
                        aria-label="Increase bundle size"
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            onIncrease();
                        }}
                        disabled={!canIncrease}
                        className={cn(
                            "flex h-11 w-11 items-center justify-center rounded-lg text-white transition-colors",
                            !canIncrease ? "cursor-not-allowed bg-fuchsia-300/15 opacity-30" : "bg-gradient-to-br from-fuchsia-400 to-violet-500 shadow-lg shadow-fuchsia-900/30 hover:brightness-110",
                        )}
                    >
                        <Plus className="h-4 w-4 font-bold" />
                    </button>
                </div>
            </div>
        </div>
    );
}