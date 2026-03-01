"use client";

import dynamic from "next/dynamic";
import { useUI } from "@/context/UIContext";

const PurchaseModal = dynamic(
    () => import("@/components/PurchaseModal").then((mod) => mod.PurchaseModal),
    {
        ssr: false,
        loading: () => null,
    }
);

export function GlobalPurchaseModal() {
    const { isPurchaseModalOpen, closePurchaseModal } = useUI();

    if (!isPurchaseModalOpen) {
        return null;
    }

    return <PurchaseModal isOpen={isPurchaseModalOpen} onClose={closePurchaseModal} />;
}
