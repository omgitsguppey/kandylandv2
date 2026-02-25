"use client";

import { createContext, useContext, useState, ReactNode, useMemo } from "react";

interface UIContextType {
    isPurchaseModalOpen: boolean;
    openPurchaseModal: () => void;
    closePurchaseModal: () => void;
    isAuthModalOpen: boolean;
    openAuthModal: () => void;
    closeAuthModal: () => void;
    isInsufficientBalanceModalOpen: boolean;
    requiredCost: number;
    openInsufficientBalanceModal: (cost: number) => void;
    closeInsufficientBalanceModal: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: ReactNode }) {
    const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [isInsufficientBalanceModalOpen, setIsInsufficientBalanceModalOpen] = useState(false);
    const [requiredCost, setRequiredCost] = useState(0);

    const openPurchaseModal = () => setIsPurchaseModalOpen(true);
    const closePurchaseModal = () => setIsPurchaseModalOpen(false);
    const openAuthModal = () => setIsAuthModalOpen(true);
    const closeAuthModal = () => setIsAuthModalOpen(false);

    const openInsufficientBalanceModal = (cost: number) => {
        setRequiredCost(cost);
        setIsInsufficientBalanceModalOpen(true);
    };
    const closeInsufficientBalanceModal = () => setIsInsufficientBalanceModalOpen(false);

    const contextValue = useMemo(() => ({
        isPurchaseModalOpen, openPurchaseModal, closePurchaseModal,
        isAuthModalOpen, openAuthModal, closeAuthModal,
        isInsufficientBalanceModalOpen, requiredCost,
        openInsufficientBalanceModal, closeInsufficientBalanceModal
    }), [
        isPurchaseModalOpen,
        isAuthModalOpen,
        isInsufficientBalanceModalOpen,
        requiredCost
    ]);

    return (
        <UIContext.Provider value={contextValue}>
            {children}
        </UIContext.Provider>
    );
}


export function useUI() {
    const context = useContext(UIContext);
    if (context === undefined) {
        throw new Error("useUI must be used within a UIProvider");
    }
    return context;
}
