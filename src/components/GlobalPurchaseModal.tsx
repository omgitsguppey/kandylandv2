"use client";

import { useUI } from "@/context/UIContext";
import { PurchaseModal } from "@/components/PurchaseModal";

export function GlobalPurchaseModal() {
    const { isPurchaseModalOpen, closePurchaseModal } = useUI();
    return <PurchaseModal isOpen={isPurchaseModalOpen} onClose={closePurchaseModal} />;
}
