"use client";

import { useRef, type ReactNode } from "react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export interface KandyWalletModalFrameProps {
    isOpen: boolean;
    busy: boolean;
    onRequestClose: (source: string) => void;
    closeControl: ReactNode;
    children: ReactNode;
}

export function KandyWalletModalFrame({
    isOpen,
    busy,
    onRequestClose,
    closeControl,
    children,
}: KandyWalletModalFrameProps) {
    const returnFocusRef = useRef<HTMLElement | null>(null);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open && !busy) onRequestClose("wallet_modal_close");
        }}>
            <DialogContent
                role="dialog"
                aria-modal="true"
                aria-labelledby="purchase-wallet-title"
                aria-describedby={undefined}
                aria-busy={busy}
                showCloseButton={false}
                data-wallet-density="public-beta-compact"
                data-wallet-balance-chip="split-source"
                data-wallet-package-subcopy="removed"
                data-wallet-bonus-chip-theme="brand-purple"
                data-wallet-mobile-density="compact"
                data-wallet-loading-stable="true"
                data-wallet-runtime-logic-unchanged="true"
                data-kandy-wallet-surface="semantic-dialog"
                className="gap-4 p-4 pt-14 sm:max-w-2xl sm:p-6 sm:pt-14"
                onOpenAutoFocus={() => {
                    if (document.activeElement instanceof HTMLElement) {
                        returnFocusRef.current = document.activeElement;
                    }
                }}
                onCloseAutoFocus={(event) => {
                    event.preventDefault();
                    if (returnFocusRef.current?.isConnected) {
                        returnFocusRef.current.focus();
                    }
                    returnFocusRef.current = null;
                }}
                onEscapeKeyDown={(event) => {
                    event.preventDefault();
                    if (!busy) onRequestClose("wallet_escape_key");
                }}
                onPointerDownOutside={(event) => {
                    event.preventDefault();
                    if (!busy) onRequestClose("wallet_backdrop");
                }}
            >
                {closeControl}
                <DialogTitle id="purchase-wallet-title" className="sr-only">Kandy shop</DialogTitle>
                {children}
            </DialogContent>
        </Dialog>
    );
}
