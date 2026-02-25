"use client";

import { useUI } from "@/context/UIContext";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Coins, X, AlertCircle } from "lucide-react";

import { motion, AnimatePresence } from "framer-motion";

export function InsufficientBalanceModal() {
    const {
        isInsufficientBalanceModalOpen,
        closeInsufficientBalanceModal,
        requiredCost,
        openPurchaseModal
    } = useUI();
    const { userProfile } = useAuth();

    if (!isInsufficientBalanceModalOpen) return null;

    const currentBalance = userProfile?.gumDropsBalance ?? 0;
    const missingAmount = Math.max(0, requiredCost - currentBalance);

    const handleGetMore = () => {
        closeInsufficientBalanceModal();
        openPurchaseModal();
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={closeInsufficientBalanceModal}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                />

                {/* Modal */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="relative w-full max-w-sm bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
                >
                    <div className="p-6 text-center">
                        <button
                            onClick={closeInsufficientBalanceModal}
                            className="absolute top-4 right-4 p-2 text-gray-500 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="w-16 h-16 bg-brand-pink/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-brand-pink/20">
                            <Coins className="w-8 h-8 text-brand-pink" />
                        </div>

                        <h2 className="text-xl font-bold text-white mb-2">Not Enough Gum Drops</h2>
                        <p className="text-gray-400 text-sm mb-6">
                            This action costs <span className="text-white font-bold">{requiredCost}</span> Gum Drops.
                            You currently have <span className="text-brand-pink font-bold">{currentBalance}</span>.
                        </p>

                        <div className="bg-white/5 rounded-2xl p-4 mb-6 flex items-center gap-3 text-left border border-white/5">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 border border-amber-500/20">
                                <AlertCircle className="w-5 h-5 text-amber-500" />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-bold text-amber-500/80 tracking-wider">Shortfall</p>
                                <p className="text-white font-mono font-bold">{missingAmount} Gum Drops needed</p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <Button
                                onClick={handleGetMore}
                                variant="brand"
                                className="w-full py-6 rounded-2xl text-lg font-bold shadow-[0_0_20px_rgba(236,72,153,0.3)]"
                            >
                                Get More Gum Drops
                            </Button>
                            <button
                                onClick={closeInsufficientBalanceModal}
                                className="w-full py-3 text-sm text-gray-500 transition-colors font-medium"
                            >
                                Maybe later
                            </button>
                        </div>
                    </div>

                    {/* Footer decoration */}
                    <div className="h-1 bg-gradient-to-r from-brand-pink via-brand-purple to-brand-cyan" />
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
