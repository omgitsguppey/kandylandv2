"use client";

import { createContext, useContext, useState, ReactNode, useMemo } from "react";

export type AuthModalEntryMode = "signin" | "signup";

interface UIContextType {
    isPurchaseModalOpen: boolean;
    preferredPurchaseDrops: number | null;
    openPurchaseModal: (preferredDrops?: number) => void;
    closePurchaseModal: () => void;
    isAuthModalOpen: boolean;
    authModalMode: AuthModalEntryMode;
    openAuthModal: (mode?: AuthModalEntryMode) => void;
    closeAuthModal: () => void;
    isInsufficientBalanceModalOpen: boolean;
    requiredCost: number;
    openInsufficientBalanceModal: (cost: number) => void;
    closeInsufficientBalanceModal: () => void;
    isProfileSidebarOpen: boolean;
    openProfileSidebar: () => void;
    closeProfileSidebar: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: ReactNode }) {
    const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
    const [preferredPurchaseDrops, setPreferredPurchaseDrops] = useState<number | null>(null);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [authModalMode, setAuthModalMode] = useState<AuthModalEntryMode>("signin");
    const [isInsufficientBalanceModalOpen, setIsInsufficientBalanceModalOpen] = useState(false);
    const [requiredCost, setRequiredCost] = useState(0);
    const [isProfileSidebarOpen, setIsProfileSidebarOpen] = useState(false);

    const openPurchaseModal = (preferredDrops?: number) => {
        setPreferredPurchaseDrops(
            Number.isFinite(preferredDrops) && Number(preferredDrops) > 0
                ? Math.floor(Number(preferredDrops))
                : null
        );
        setIsPurchaseModalOpen(true);
    };
    const closePurchaseModal = () => {
        setIsPurchaseModalOpen(false);
        setPreferredPurchaseDrops(null);
    };
    const openAuthModal = (mode: AuthModalEntryMode = "signin") => {
        setAuthModalMode(mode);
        setIsAuthModalOpen(true);
    };
    const closeAuthModal = () => setIsAuthModalOpen(false);

    const openInsufficientBalanceModal = (cost: number) => {
        setRequiredCost(cost);
        setIsInsufficientBalanceModalOpen(true);
    };
    const closeInsufficientBalanceModal = () => setIsInsufficientBalanceModalOpen(false);
    const openProfileSidebar = () => setIsProfileSidebarOpen(true);
    const closeProfileSidebar = () => setIsProfileSidebarOpen(false);

    const contextValue = useMemo(() => ({
        isPurchaseModalOpen, openPurchaseModal, closePurchaseModal,
        preferredPurchaseDrops,
        isAuthModalOpen, authModalMode, openAuthModal, closeAuthModal,
        isInsufficientBalanceModalOpen, requiredCost,
        openInsufficientBalanceModal, closeInsufficientBalanceModal,
        isProfileSidebarOpen, openProfileSidebar, closeProfileSidebar
    }), [
        isPurchaseModalOpen,
        preferredPurchaseDrops,
        isAuthModalOpen,
        authModalMode,
        isInsufficientBalanceModalOpen,
        requiredCost,
        isProfileSidebarOpen
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
