"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { PayPalButtons, usePayPalScriptReducer, SCRIPT_LOADING_STATE, DISPATCH_ACTION } from "@paypal/react-paypal-js";
import { X, Candy } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { authFetch } from "@/lib/authFetch";
import { motion, AnimatePresence } from "framer-motion";

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type PurchasePackage = { drops: number; price: number; label: string };

const PACKAGES: PurchasePackage[] = [
  { drops: 100, price: 1.0, label: "Starter Pack" },
  { drops: 550, price: 5.0, label: "Fan Pack (+50 Bonus)" },
  { drops: 1100, price: 10.0, label: "Premium Stash (+100 Bonus)" },
  { drops: 2500, price: 20.0, label: "Ultimate Kandy (+500 Bonus)" },
];

const PAYPAL_READY = Boolean(
  process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID_SANDBOX || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID_LIVE
);

export function PurchaseModal({ isOpen, onClose }: PurchaseModalProps) {
  const { user } = useAuth();
  const [selectedPackage, setSelectedPackage] = useState<PurchasePackage>(PACKAGES[1]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [{ isResolved, isPending }, dispatch] = usePayPalScriptReducer();

  useEffect(() => {
    if (isOpen) {
      if (!isResolved && !isPending && dispatch) {
        dispatch({ type: DISPATCH_ACTION.LOADING_STATUS, value: SCRIPT_LOADING_STATE.PENDING });
      }
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => { document.body.style.overflow = ""; }
  }, [isOpen, isResolved, isPending, dispatch]);

  const closeModal = useCallback(() => {
    setSuccess(false);
    setError(null);
    requestAnimationFrame(onClose);
  }, [onClose]);

  const selectedPriceKey = useMemo(() => selectedPackage.price.toFixed(2), [selectedPackage.price]);

  const handleApprove = async (orderId: string) => {
    setProcessing(true);
    setError(null);
    try {
      if (!user) throw new Error("User not authenticated");

      const response = await authFetch("/api/paypal/capture", {
        method: "POST",
        body: JSON.stringify({ orderId, expectedDrops: selectedPackage.drops }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Payment verification failed");

      if (result.duplicate) toast.info("This payment was already processed.");

      import("canvas-confetti")
        .then((mod) => mod.default({ particleCount: 100, spread: 70, origin: { y: 0.6 } }))
        .catch(() => undefined);

      setSuccess(true);
      toast.success(`${result.drops || selectedPackage.drops} Gum Drops added!`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Purchase failed. Please contact support.";
      setError(message);
      toast.error("Purchase failed", { description: message });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={closeModal} aria-hidden="true" />
          <div className="fixed inset-0 z-50 overflow-y-auto pointer-events-none">
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="relative w-full max-w-md bg-black/45 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-2xl border border-white/10 pointer-events-auto"
              >
                <button onClick={closeModal} className="absolute top-4 right-4 p-2 rounded-full text-gray-400 transition-colors z-20">
                  <X className="w-5 h-5" />
                </button>

                {!success ? (
                  <div>
                    <div className="text-center mb-8">
                      <div className="w-16 h-16 bg-gradient-to-tr from-brand-pink to-brand-purple rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-brand-pink/20">
                        <Candy className="w-8 h-8 text-white drop-shadow-md" />
                      </div>
                      <h2 className="text-2xl font-bold text-white mb-1 tracking-tight">Get Gum Drops</h2>
                      <p className="text-gray-400 text-sm font-medium">Unwrap exclusive content instantly.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-8">
                      {PACKAGES.map((pkg, index) => {
                        const isSelected = selectedPackage.drops === pkg.drops;
                        const isPopular = index === 1;
                        return (
                          <button
                            key={pkg.drops}
                            onClick={() => setSelectedPackage(pkg)}
                            className={cn(
                              "relative p-4 rounded-2xl text-left border",
                              isSelected
                                ? "bg-brand-pink/10 border-brand-pink/50 ring-1 ring-brand-pink/30 shadow-[0_0_20px_rgba(236,72,153,0.15)] scale-[1.02]"
                                : "bg-white/5 border-white/5"
                            )}
                          >
                            {isPopular && <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-brand-cyan to-blue-500 text-[10px] font-bold px-2 py-0.5 rounded-full text-white">Best Value</span>}
                            <div className="font-bold text-lg text-white mb-0.5">{pkg.drops}</div>
                            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">{pkg.label}</div>
                            <div className={cn("font-bold", isSelected ? "text-brand-pink" : "text-white")}>${pkg.price}</div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="w-full min-h-[150px] relative z-10">
                      {!PAYPAL_READY ? (
                        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-xs text-yellow-200">
                          PayPal is not configured. Set client IDs for sandbox/live before taking payments.
                        </div>
                      ) : (
                        <PayPalButtons
                          forceReRender={[selectedPriceKey]}
                          style={{ layout: "vertical", color: "white", shape: "rect", label: "pay", height: 48 }}
                          disabled={processing}
                          createOrder={(_data, actions) =>
                            actions.order.create({
                              intent: "CAPTURE",
                              purchase_units: [
                                {
                                  description: `${selectedPackage.drops} Gum Drops - Virtual Currency`,
                                  amount: { currency_code: "USD", value: selectedPriceKey },
                                  custom_id: `${user?.uid || "guest"}:${selectedPackage.drops}`,
                                },
                              ],
                            })
                          }
                          onApprove={async (data) => {
                            if (data.orderID) await handleApprove(data.orderID);
                          }}
                          onError={() => setError("PayPal encountered an error. Please try again.")}
                        />
                      )}
                    </div>

                    {error && <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-center text-xs font-bold">{error}</div>}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <div className="w-20 h-20 bg-brand-green/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(20,230,130,0.3)]">
                      <Candy className="w-10 h-10 text-brand-green drop-shadow-md" />
                    </div>
                    <h3 className="text-3xl font-bold text-white mb-2 tracking-tight">All Set!</h3>
                    <p className="text-gray-400 mb-8 max-w-[200px] mx-auto">You&apos;ve added <strong>{selectedPackage.drops} Gum Drops</strong> to your stash.</p>
                    <button onClick={closeModal} className="w-full py-3 rounded-xl font-bold bg-white text-black transition-colors">Awesome</button>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
