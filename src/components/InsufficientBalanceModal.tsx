"use client";

import { useUI } from "@/context/UIContext";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Coins, X, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { motion, AnimatePresence } from "framer-motion";
import { isBundleGumdropAmount, resolvePreferredGumdropAmount } from "@/lib/gumdrops-packages";
import { trackEvent } from "@/lib/telemetry";

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
    const exactAmountSupported =
        [100, 550, 1100, 2500].includes(missingAmount) ||
        isBundleGumdropAmount(missingAmount);
    const recommendedDrops = resolvePreferredGumdropAmount(missingAmount);

    const handleGetMore = () => {
        trackEvent("insufficient_balance_get_more_clicked");
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
                    onClick={() => {
                        trackEvent("insufficient_balance_modal_closed");
                        closeInsufficientBalanceModal();
                    }}
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
                            onClick={() => {
                                trackEvent("insufficient_balance_modal_closed");
                                closeInsufficientBalanceModal();
                            }}
                            className="absolute top-4 right-4 p-2 text-gray-500 transition-colors"
                            aria-label="Close modal"
                            title="Close modal"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="w-16 h-16 bg-brand-purple/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-brand-purple/20">
                            <Coins className="w-8 h-8 text-brand-purple" />
                        </div>

                        <h2 className="text-xl font-bold text-white mb-2">Not Enough Gum Drops</h2>
                        <p className="text-gray-400 text-sm mb-6">
                            This action costs <span className="text-white font-bold">{requiredCost}</span> Gum Drops.
                            You currently have <span className="text-brand-purple font-bold">{currentBalance}</span>.
                        </p>

                        <div className="bg-white/5 rounded-2xl p-4 mb-6 flex items-center gap-3 text-left border border-white/5">
                            <div className="w-10 h-10 rounded-xl bg-brand-purple/10 flex items-center justify-center shrink-0 border border-brand-purple/20">
                                <AlertCircle className="w-5 h-5 text-brand-purple" />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-bold text-brand-purple/80 tracking-wider">Shortfall</p>
                                <p className="text-white font-mono font-bold">{missingAmount} Gum Drops needed</p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <Button
                                onClick={() => {
                                    trackEvent("insufficient_balance_get_more_clicked");
                                    closeInsufficientBalanceModal();
                                    openPurchaseModal(recommendedDrops);
                                    toast.info(
                                        exactAmountSupported
                                            ? `Prepared ${recommendedDrops} GD for checkout.`
                                            : `Prepared the closest supported pack: ${recommendedDrops} GD.`,
                                    );
                                }}
                                variant="brand"
                                className="w-full py-6 rounded-2xl text-lg font-bold shadow-[0_0_20px_rgba(236,72,153,0.3)] bg-gradient-to-r from-brand-purple to-brand-purple"
                            >
                                {exactAmountSupported ? `Get ${recommendedDrops} GD` : `Get Recommended Pack (${recommendedDrops} GD)`}
                            </Button>
                            <Button
                                onClick={handleGetMore}
                                variant="outline"
                                className="w-full py-4 rounded-xl font-bold bg-white/5 border-white/10 hover:bg-white/10 text-white"
                            >
                                See All Packages
                            </Button>
                            <button
                                onClick={() => {
                                    trackEvent("insufficient_balance_modal_closed");
                                    closeInsufficientBalanceModal();
                                }}
                                className="w-full py-3 text-sm text-gray-500 transition-colors font-medium"
                            >
                                Maybe later
                            </button>
                        </div>
                    </div>

                    {/* Footer decoration */}
                    <div className="h-1 bg-gradient-to-r from-brand-purple via-brand-purple to-brand-purple" />
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
