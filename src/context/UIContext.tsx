"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type AuthModalEntryMode = "signin" | "signup" | "creator_signup";

interface UIStateContextType {
    isPurchaseModalOpen: boolean;
    preferredPurchaseDrops: number | null;
    isAuthModalOpen: boolean;
    authModalMode: AuthModalEntryMode;
    isInsufficientBalanceModalOpen: boolean;
    requiredCost: number;
    isProfileSidebarOpen: boolean;
}

interface UIActionsContextType {
    openPurchaseModal: (preferredDrops?: number) => void;
    closePurchaseModal: () => void;
    openAuthModal: (mode?: AuthModalEntryMode) => void;
    closeAuthModal: () => void;
    openInsufficientBalanceModal: (cost: number) => void;
    closeInsufficientBalanceModal: () => void;
    openProfileSidebar: () => void;
    closeProfileSidebar: () => void;
}

type UIContextType = UIStateContextType & UIActionsContextType;

const UIContext = createContext<UIStateContextType | undefined>(undefined);
const UIActionsContext = createContext<UIActionsContextType | undefined>(undefined);

export function UIProvider({ children }: { children: ReactNode }) {
    const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
    const [preferredPurchaseDrops, setPreferredPurchaseDrops] = useState<number | null>(null);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [authModalMode, setAuthModalMode] = useState<AuthModalEntryMode>("signin");
    const [isInsufficientBalanceModalOpen, setIsInsufficientBalanceModalOpen] = useState(false);
    const [requiredCost, setRequiredCost] = useState(0);
    const [isProfileSidebarOpen, setIsProfileSidebarOpen] = useState(false);

    const openPurchaseModal = useCallback((preferredDrops?: number) => {
        setPreferredPurchaseDrops(
            Number.isFinite(preferredDrops) && Number(preferredDrops) > 0
                ? Math.floor(Number(preferredDrops))
                : null,
        );
        setIsPurchaseModalOpen(true);
    }, []);

    const closePurchaseModal = useCallback(() => {
        setIsPurchaseModalOpen(false);
        setPreferredPurchaseDrops(null);
    }, []);

    const openAuthModal = useCallback((mode: AuthModalEntryMode = "signin") => {
        setAuthModalMode(mode);
        setIsAuthModalOpen(true);
    }, []);

    const closeAuthModal = useCallback(() => setIsAuthModalOpen(false), []);

    const openInsufficientBalanceModal = useCallback((cost: number) => {
        setRequiredCost(cost);
        setIsInsufficientBalanceModalOpen(true);
    }, []);

    const closeInsufficientBalanceModal = useCallback(() => setIsInsufficientBalanceModalOpen(false), []);
    const openProfileSidebar = useCallback(() => setIsProfileSidebarOpen(true), []);
    const closeProfileSidebar = useCallback(() => setIsProfileSidebarOpen(false), []);

    const stateValue = useMemo(() => ({
        isPurchaseModalOpen,
        preferredPurchaseDrops,
        isAuthModalOpen,
        authModalMode,
        isInsufficientBalanceModalOpen,
        requiredCost,
        isProfileSidebarOpen,
    }), [
        authModalMode,
        isAuthModalOpen,
        isInsufficientBalanceModalOpen,
        isProfileSidebarOpen,
        isPurchaseModalOpen,
        preferredPurchaseDrops,
        requiredCost,
    ]);

    const actionsValue = useMemo(() => ({
        openPurchaseModal,
        closePurchaseModal,
        openAuthModal,
        closeAuthModal,
        openInsufficientBalanceModal,
        closeInsufficientBalanceModal,
        openProfileSidebar,
        closeProfileSidebar,
    }), [
        closeAuthModal,
        closeInsufficientBalanceModal,
        closeProfileSidebar,
        closePurchaseModal,
        openAuthModal,
        openInsufficientBalanceModal,
        openProfileSidebar,
        openPurchaseModal,
    ]);

    return (
        <UIContext.Provider value={stateValue}>
            <UIActionsContext.Provider value={actionsValue}>
                {children}
            </UIActionsContext.Provider>
        </UIContext.Provider>
    );
}

export function useUI(): UIContextType {
    const state = useContext(UIContext);
    const actions = useContext(UIActionsContext);
    if (state === undefined || actions === undefined) {
        throw new Error("useUI must be used within a UIProvider");
    }
    return { ...state, ...actions };
}

export function useUIActions(): UIActionsContextType {
    const actions = useContext(UIActionsContext);
    if (actions === undefined) {
        throw new Error("useUIActions must be used within a UIProvider");
    }
    return actions;
}
