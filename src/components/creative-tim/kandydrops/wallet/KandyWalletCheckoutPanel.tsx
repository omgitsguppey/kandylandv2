"use client";

import type { ReactNode } from "react";

export interface KandyWalletCheckoutReviewProps {
    selectedAmount: number;
    selectedPriceLabel: string;
}

export interface KandyWalletCheckoutProviderProps {
    children: ReactNode;
}

export interface KandyWalletPurchaseSequenceProps {
    selection: ReactNode;
    review: ReactNode;
    provider: ReactNode;
}

export function KandyWalletPurchaseSequence({
    selection,
    review,
    provider,
}: KandyWalletPurchaseSequenceProps) {
    return (
        <div className="grid gap-4" data-wallet-purchase-path="three-stage" data-wallet-mobile-density="compact" data-payment-module-density="compact-v2">
            <section className="grid gap-3" data-wallet-purchase-slot="selection">
                {selection}
            </section>
            <section data-wallet-purchase-slot="review">
                {review}
            </section>
            <section data-wallet-purchase-slot="provider">
                {provider}
            </section>
        </div>
    );
}

export function KandyWalletCheckoutReview({
    selectedAmount,
    selectedPriceLabel,
}: KandyWalletCheckoutReviewProps) {
    return (
        <section className="rounded-[1.25rem] border border-fuchsia-200/15 bg-fuchsia-400/[0.07] px-3.5 py-3.5" aria-labelledby="wallet-delivery-review">
            <div className="flex items-center justify-between gap-3">
                <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full border border-fuchsia-100/25 bg-fuchsia-200/10 px-2 text-[10px] font-black tracking-[0.16em] text-fuchsia-100">02</span>
                <span className="text-[9px] font-black uppercase tracking-[0.16em] text-fuchsia-100/55">Confirm your delivery</span>
            </div>
            <h3 id="wallet-delivery-review" className="mt-3 text-lg font-black tracking-tight text-white">Review your refill</h3>
            <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-white/12 bg-slate-950/30 p-2.5">
                    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-violet-100/50">Delivered after capture</p>
                    <p className="mt-1 text-lg font-black tracking-tight text-white">{selectedAmount.toLocaleString()} GD</p>
                </div>
                <div className="rounded-xl border border-white/12 bg-slate-950/30 p-2.5">
                    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-violet-100/50">Today&apos;s payment</p>
                    <p className="mt-1 text-lg font-black tracking-tight text-white">{selectedPriceLabel}</p>
                </div>
            </div>
        </section>
    );
}

export function KandyWalletCheckoutProvider({ children }: KandyWalletCheckoutProviderProps) {
    return (
        <section className="rounded-[1.25rem] border border-white/12 bg-white/[0.055] px-3.5 pb-3.5 pt-3" aria-labelledby="wallet-provider-payment">
            <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-100/55">03 / Secure provider payment</p>
                    <h3 id="wallet-provider-payment" className="mt-1 text-lg font-black tracking-tight text-white">Complete purchase</h3>
                </div>
                <span className="mt-0.5 rounded-full border border-emerald-200/20 bg-emerald-300/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-emerald-100">Protected</span>
            </div>
            {children}
        </section>
    );
}

export interface KandyWalletCheckoutPanelProps extends KandyWalletCheckoutReviewProps {
    children: ReactNode;
}

export function KandyWalletCheckoutPanel({
    children,
    selectedAmount,
    selectedPriceLabel,
}: KandyWalletCheckoutPanelProps) {
    return (
        <section
            className="relative z-10 grid gap-3 rounded-[1.65rem] border border-white/15 bg-slate-950/45 p-3 shadow-[0_22px_70px_rgba(20,8,48,0.3)]"
            data-wallet-mobile-density="compact"
            data-payment-module-density="compact-v2"
        >
            <KandyWalletCheckoutReview
                selectedAmount={selectedAmount}
                selectedPriceLabel={selectedPriceLabel}
            />
            <KandyWalletCheckoutProvider>{children}</KandyWalletCheckoutProvider>
        </section>
    );
}
