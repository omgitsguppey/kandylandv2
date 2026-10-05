"use client";

import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { ContentSection } from "@/components/ui/content-layout";

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

export function KandyWalletPurchaseSequence({ selection, review, provider }: KandyWalletPurchaseSequenceProps) {
    return (
        <ContentSection className="grid gap-4 space-y-0" data-wallet-purchase-path="three-stage" data-wallet-mobile-density="compact" data-payment-module-density="compact-v2">
            <ContentSection className="grid gap-3 space-y-0" data-wallet-purchase-slot="selection">{selection}</ContentSection>
            <ContentSection data-wallet-purchase-slot="review">{review}</ContentSection>
            <ContentSection data-wallet-purchase-slot="provider">{provider}</ContentSection>
        </ContentSection>
    );
}

export function KandyWalletCheckoutReview({ selectedAmount, selectedPriceLabel }: KandyWalletCheckoutReviewProps) {
    return (
        <Card className="gap-2 px-3 py-3 shadow-none" aria-labelledby="wallet-delivery-review">
            <h3 id="wallet-delivery-review" className="text-sm font-semibold text-foreground">Review your refill</h3>
            <dl className="grid grid-cols-2 gap-3">
                <div>
                    <dt className="text-xs text-muted-foreground">Delivered after capture</dt>
                    <dd className="mt-1 text-lg font-semibold text-foreground">{selectedAmount.toLocaleString()} GD</dd>
                </div>
                <div>
                    <dt className="text-xs text-muted-foreground">Today&apos;s payment</dt>
                    <dd className="mt-1 text-lg font-semibold text-foreground">{selectedPriceLabel}</dd>
                </div>
            </dl>
        </Card>
    );
}

export function KandyWalletCheckoutProvider({ children }: KandyWalletCheckoutProviderProps) {
    return (
        <section className="grid gap-2" aria-labelledby="wallet-provider-payment">
            <h3 id="wallet-provider-payment" className="text-sm font-semibold text-foreground">Complete purchase</h3>
            {children}
        </section>
    );
}
