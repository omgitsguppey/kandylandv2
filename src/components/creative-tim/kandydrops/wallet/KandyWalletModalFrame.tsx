"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode, Ref } from "react";

export interface KandyWalletModalFrameProps {
    isOpen: boolean;
    onBackdropClick: () => void;
    dialogRef: Ref<HTMLDivElement>;
    closeControl: ReactNode;
    children: ReactNode;
}

export function KandyWalletModalFrame({
    isOpen,
    onBackdropClick,
    dialogRef,
    closeControl,
    children,
}: KandyWalletModalFrameProps) {
    return (
        <AnimatePresence>
            {isOpen ? (
                <>
                    <motion.button
                        type="button"
                        tabIndex={-1}
                        aria-label="Close Kandy shop"
                        className="fixed inset-0 z-40 cursor-default bg-[radial-gradient(circle_at_top_left,rgba(244,114,182,0.28),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.32),transparent_44%),rgba(8,5,24,0.78)] backdrop-blur-md"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onBackdropClick}
                    />
                    <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain pointer-events-none">
                        <div className="flex min-h-full items-end justify-center sm:items-center sm:p-5">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.975, y: 26 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.975, y: 20 }}
                                transition={{ type: "spring", damping: 27, stiffness: 300 }}
                                ref={dialogRef}
                                role="dialog"
                                aria-modal="true"
                                aria-labelledby="purchase-wallet-title"
                                data-wallet-density="public-beta-compact"
                                data-wallet-balance-chip="split-source"
                                data-wallet-package-subcopy="removed"
                                data-wallet-bonus-chip-theme="brand-purple"
                                data-wallet-mobile-density="compact"
                                data-wallet-loading-stable="true"
                                data-wallet-runtime-logic-unchanged="true"
                                data-kandy-wallet-surface="soft-ui"
                                className="pointer-events-auto relative isolate min-h-[100dvh] w-full overflow-hidden border border-white/15 bg-[linear-gradient(145deg,#19072f_0%,#080c22_48%,#170725_100%)] shadow-[0_-24px_90px_rgba(10,2,28,0.56)] sm:min-h-0 sm:max-w-2xl sm:rounded-[2.25rem] sm:shadow-[0_30px_120px_rgba(10,2,28,0.72)]"
                            >
                                <div
                                    aria-hidden="true"
                                    className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_18%_0%,rgba(244,114,182,0.34),transparent_56%),radial-gradient(circle_at_86%_16%,rgba(139,92,246,0.3),transparent_52%)]"
                                />
                                <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-pink-100/70 to-transparent" />
                                {closeControl}
                                <div className="relative px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-16 sm:px-7 sm:pb-7 sm:pt-8">
                                    {children}
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </>
            ) : null}
        </AnimatePresence>
    );
}