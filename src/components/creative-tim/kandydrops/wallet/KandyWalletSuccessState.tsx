"use client";

import { Candy } from "lucide-react";
import type { ReactNode } from "react";

export interface KandyWalletSuccessStateProps {
    creditedDrops: number;
    paidDrops: number;
    bonusDrops: number;
    securedPriceLabel: string;
    onUnwrap: () => void;
    onExploreExperiences: () => void;
    reportBugControl: ReactNode;
}

export function KandyWalletSuccessState({
    creditedDrops,
    paidDrops,
    bonusDrops,
    securedPriceLabel,
    onUnwrap,
    onExploreExperiences,
    reportBugControl,
}: KandyWalletSuccessStateProps) {
    return (
        <div className="relative grid gap-5 py-3 text-center" data-wallet-mobile-density="compact">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.6rem] border border-white/25 bg-[linear-gradient(145deg,rgba(244,114,182,0.44),rgba(167,139,250,0.42))] shadow-[0_0_32px_rgba(244,114,182,0.32)]">
                <Candy className="h-8 w-8 text-pink-100 drop-shadow-md" />
            </div>
            <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-pink-100">03 / Payment confirmed</p>
                <h3 className="mt-2 text-3xl font-black tracking-tight text-white">Your Kandy is ready</h3>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-5 text-violet-100/80">
                    <strong className="text-white">{creditedDrops.toLocaleString()} GumDrops</strong> are now available for your next unwrap.
                </p>
            </div>
            <section className="grid overflow-hidden rounded-[1.35rem] border border-white/15 bg-slate-950/35 text-left sm:grid-cols-3" aria-label="Purchase delivery summary">
                <div className="border-b border-white/12 px-3.5 py-3 sm:border-b-0 sm:border-r">
                    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-violet-100/50">Delivered</p>
                    <p className="mt-1 text-lg font-black text-white">{creditedDrops.toLocaleString()} GD</p>
                </div>
                <div className="border-b border-white/12 px-3.5 py-3 sm:border-b-0 sm:border-r">
                    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-pink-100/62">Paid source</p>
                    <p className="mt-1 text-lg font-black text-white">{paidDrops.toLocaleString()} GD</p>
                    {bonusDrops > 0 ? <p className="mt-0.5 text-[10px] font-bold text-violet-100/68">+{bonusDrops.toLocaleString()} paid bonus GD</p> : null}
                </div>
                <div className="px-3.5 py-3">
                    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-violet-100/50">Payment</p>
                    <p className="mt-1 text-lg font-black text-white">{securedPriceLabel}</p>
                    <p className="mt-0.5 text-[10px] font-bold text-emerald-100/75">Captured securely</p>
                </div>
            </section>
            <div className="grid gap-2">
                <button
                    type="button"
                    onClick={onUnwrap}
                    className="min-h-12 w-full rounded-2xl border border-pink-100/45 bg-gradient-to-r from-fuchsia-500 to-violet-500 px-4 py-3 text-sm font-black text-white shadow-lg shadow-fuchsia-950/25 transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-100/80"
                >
                    Unwrap now
                </button>
                <button
                    type="button"
                    onClick={onExploreExperiences}
                    className="min-h-12 w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-100/80"
                >
                    Keep the streak going
                </button>
            </div>
            <div className="flex justify-center">
                {reportBugControl}
            </div>
        </div>
    );
}