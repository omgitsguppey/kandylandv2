"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface UIContextType {
    isPurchaseModalOpen: boolean;
    openPurchaseModal: () => void;
    closePurchaseModal: () => void;
    isAuthModalOpen: boolean;
    openAuthModal: () => void;
    closeAuthModal: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: ReactNode }) {
    const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

    const openPurchaseModal = () => setIsPurchaseModalOpen(true);
    const closePurchaseModal = () => setIsPurchaseModalOpen(false);
    const openAuthModal = () => setIsAuthModalOpen(true);
    const closeAuthModal = () => setIsAuthModalOpen(false);

    return (
        <UIContext.Provider value={{
            isPurchaseModalOpen, openPurchaseModal, closePurchaseModal,
            isAuthModalOpen, openAuthModal, closeAuthModal
        }}>
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
