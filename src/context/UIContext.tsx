"use client";

import { createContext, useContext, useState, ReactNode, useMemo } from "react";

export type AuthModalEntryMode = "signin" | "signup";

interface UIContextType {
    isPurchaseModalOpen: boolean;
    openPurchaseModal: () => void;
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
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [authModalMode, setAuthModalMode] = useState<AuthModalEntryMode>("signin");
    const [isInsufficientBalanceModalOpen, setIsInsufficientBalanceModalOpen] = useState(false);
    const [requiredCost, setRequiredCost] = useState(0);
    const [isProfileSidebarOpen, setIsProfileSidebarOpen] = useState(false);

    const openPurchaseModal = () => setIsPurchaseModalOpen(true);
    const closePurchaseModal = () => setIsPurchaseModalOpen(false);
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
        isAuthModalOpen, authModalMode, openAuthModal, closeAuthModal,
        isInsufficientBalanceModalOpen, requiredCost,
        openInsufficientBalanceModal, closeInsufficientBalanceModal,
        isProfileSidebarOpen, openProfileSidebar, closeProfileSidebar
    }), [
        isPurchaseModalOpen,
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
