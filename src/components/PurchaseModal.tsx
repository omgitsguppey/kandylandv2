"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js";
import { useRouter } from "next/navigation";
import { X, Candy, Minus, Plus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { authFetch } from "@/lib/authFetch";
import { motion, AnimatePresence } from "framer-motion";
import { GuestComponentBlur } from "@/components/Auth/GuestComponentBlur";
import { clearTimedFlow, consumeTimedFlow, startTimedFlow, trackEvent } from "@/lib/telemetry";
import { GUMDROPS_SUPPORT_COPY, SECONDARY_UNWRAP_CTA } from "@/lib/marketing-copy";
import { useUI } from "@/context/UIContext";
import { deriveGumdropEconomics } from "@/lib/gumdrop-economics";
import { ReportBugButton } from "@/components/Feedback/ReportBugButton";
import { dispatchActivitySync } from "@/lib/activity-sync";
import { FIXED_GUMDROP_PACKAGES } from "@/lib/gumdrops-packages";
import type { DailyTasksState } from "@/lib/tasks/task-catalog";
import { reportClientIssue } from "@/lib/client-error-reporting";

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type PurchasePackage = { drops: number; price: number; label: string; bonus?: string; isPopular?: boolean };

const PACKAGES: PurchasePackage[] = FIXED_GUMDROP_PACKAGES.map((entry) => ({
  drops: entry.drops,
  price: entry.priceUsd,
  label: entry.label,
  bonus: entry.bonus,
}));

const PAYPAL_READY = (process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID_LIVE?.trim()?.length ?? 0) > 0;
const CHECKOUT_FLOW_KEY = "wallet_checkout";

export function PurchaseModal({ isOpen, onClose }: PurchaseModalProps) {
  const { user, userProfile, setUserProfile } = useAuth();
  const { preferredPurchaseDrops } = useUI();
  const router = useRouter();
  const [selectedPackage, setSelectedPackage] = useState<PurchasePackage>(PACKAGES[1]);
  const [customDrops, setCustomDrops] = useState<number>(5000);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [creditedDrops, setCreditedDrops] = useState<number | null>(null);
  const [{ isPending }] = usePayPalScriptReducer();
  const paypalReady = PAYPAL_READY;
  const paypalLoading = isPending;
  const paypalFailed = false;
  const hasTrackedOpenRef = useRef(false);
  const isBundleSelected = selectedPackage.label === "King Size Bundle";
  const canDecreaseBundle = customDrops > 5000;
  const canIncreaseBundle = customDrops < 100000;

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const closeModal = useCallback(() => {
    setSuccess(false);
    setError(null);
    setCreditedDrops(null);
    clearTimedFlow(CHECKOUT_FLOW_KEY);
    requestAnimationFrame(onClose);
  }, [onClose]);

  const continueFromSuccess = useCallback((destination: string, source: string) => {
    trackEvent("navigation_click", {
      destination,
      source,
    });
    closeModal();
    requestAnimationFrame(() => {
      router.push(destination);
    });
  }, [closeModal, router]);

  const selectedPriceKey = useMemo(() => selectedPackage.price.toFixed(2), [selectedPackage.price]);
  const selectedEconomics = useMemo(
    () => deriveGumdropEconomics(selectedPackage.drops, selectedPackage.price),
    [selectedPackage.drops, selectedPackage.price],
  );
  const creditedDropsValue = creditedDrops ?? selectedPackage.drops;

  useEffect(() => {
    if (isOpen && !hasTrackedOpenRef.current) {
      trackEvent("wallet_opened", {
        package_label: selectedPackage.label,
        package_drops: selectedPackage.drops,
        package_price: selectedPackage.price,
        package_paid_drops: selectedEconomics.paidGumDrops,
        package_bonus_drops: selectedEconomics.bonusGumDrops,
        package_adjusted_profit_usd: selectedEconomics.adjustedProfitUsd,
      });
    }

    hasTrackedOpenRef.current = isOpen;
  }, [
    isOpen,
    selectedEconomics.adjustedProfitUsd,
    selectedEconomics.bonusGumDrops,
    selectedEconomics.paidGumDrops,
    selectedPackage.drops,
    selectedPackage.label,
    selectedPackage.price,
  ]);

  const selectBundlePackage = useCallback((drops: number) => {
    const bundle = {
      drops,
      price: (drops / 1000) * 5,
      label: "King Size Bundle",
    };

    setSelectedPackage(bundle);
    const bundleEconomics = deriveGumdropEconomics(bundle.drops, bundle.price);
    trackEvent("purchase_package_selected", {
      package_label: bundle.label,
      package_drops: bundle.drops,
      package_price: bundle.price,
      package_paid_drops: bundleEconomics.paidGumDrops,
      package_bonus_drops: bundleEconomics.bonusGumDrops,
    });

    return bundle;
  }, []);

  const updateBundleDrops = useCallback((delta: number) => {
    setCustomDrops((prev) => {
      const nextDrops = Math.min(100000, Math.max(5000, prev + delta));
      selectBundlePackage(nextDrops);
      return nextDrops;
    });
  }, [selectBundlePackage]);

  const resolvePreferredPackage = useCallback((drops: number): PurchasePackage => {
    const normalizedDrops = Math.max(1, Math.floor(drops));
    const exactPackage = PACKAGES.find((pkg) => pkg.drops === normalizedDrops);
    if (exactPackage) {
      return exactPackage;
    }

    if (normalizedDrops >= 5000) {
      const bundleDrops = Math.min(100000, Math.max(5000, Math.ceil(normalizedDrops / 1000) * 1000));
      return {
        drops: bundleDrops,
        price: (bundleDrops / 1000) * 5,
        label: "King Size Bundle",
      };
    }

    return PACKAGES.find((pkg) => pkg.drops >= normalizedDrops) ?? PACKAGES[PACKAGES.length - 1];
  }, []);

  useEffect(() => {
    if (!isOpen || !preferredPurchaseDrops) {
      return;
    }

    const preferredPackage = resolvePreferredPackage(preferredPurchaseDrops);
    setSelectedPackage(preferredPackage);
    if (preferredPackage.label === "King Size Bundle") {
      setCustomDrops(preferredPackage.drops);
    }
  }, [isOpen, preferredPurchaseDrops, resolvePreferredPackage]);

  const handleApprove = async (orderId: string) => {
    setProcessing(true);
    setError(null);
    try {
      if (!user) throw new Error("User not authenticated");

      const response = await authFetch("/api/paypal/capture", {
        method: "POST",
        body: JSON.stringify({ orderId, expectedDrops: selectedPackage.drops }),
      });

      const result = await response.json() as {
        error?: string;
        duplicate?: boolean;
        drops?: number;
        gumDropsBalance?: number | null;
        dailyTasksState?: DailyTasksState | null;
      };
      if (!response.ok) throw new Error(result.error || "Payment verification failed");

      if (result.duplicate) toast.info("This payment was already processed.");

      import("canvas-confetti")
        .then((mod) => mod.default({ particleCount: 100, spread: 70, origin: { y: 0.6 } }))
        .catch(() => undefined);

      setSuccess(true);
      setCreditedDrops(Number.isFinite(result.drops) ? Number(result.drops) : selectedPackage.drops);
      setUserProfile((currentProfile) => (
        currentProfile
          ? {
            ...currentProfile,
            gumDropsBalance: Number.isFinite(result.gumDropsBalance) ? Number(result.gumDropsBalance) : currentProfile.gumDropsBalance,
            dailyTasksState: result.dailyTasksState ?? currentProfile.dailyTasksState,
          }
          : currentProfile
      ));
      dispatchActivitySync();
      toast.success(`${result.drops || selectedPackage.drops} Gum Drops added!`);

      trackEvent("purchase", {
        transaction_id: orderId,
        value: selectedPackage.price,
        currency: "USD",
        items: [{
          item_id: `gumdrops_${selectedPackage.drops}`,
          item_name: selectedPackage.label,
          price: selectedPackage.price,
          quantity: 1
        }]
      });
      trackEvent("gumdrops_purchase_completed", {
        package_label: selectedPackage.label,
        package_drops: selectedPackage.drops,
        package_price: selectedPackage.price,
        package_paid_drops: selectedEconomics.paidGumDrops,
        package_bonus_drops: selectedEconomics.bonusGumDrops,
        package_bonus_value_usd: selectedEconomics.bonusValueUsd,
        package_adjusted_profit_usd: selectedEconomics.adjustedProfitUsd,
        package_effective_usd_per_100_gd: selectedEconomics.effectiveUsdPer100Gd,
        ...(consumeTimedFlow(CHECKOUT_FLOW_KEY).mergedParams ?? {}),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Purchase failed. Please contact support.";
      reportClientIssue({
        channel: "payments",
        message: "PayPal capture approval failed",
        error: err,
        detail: {
          stage: "capture",
          packageLabel: selectedPackage.label,
          packageDrops: selectedPackage.drops,
          packagePrice: selectedPackage.price,
        },
        consoleLabel: "[Wallet] PayPal capture failed",
      });
      setError(message);
      trackEvent("gumdrops_purchase_failed", {
        package_label: selectedPackage.label,
        package_drops: selectedPackage.drops,
        package_price: selectedPackage.price,
        package_paid_drops: selectedEconomics.paidGumDrops,
        package_bonus_drops: selectedEconomics.bonusGumDrops,
        ...(consumeTimedFlow(CHECKOUT_FLOW_KEY, { failure_reason: message }).mergedParams ?? {}),
      });
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
                <button aria-label="Close modal" onClick={closeModal} className="absolute top-4 right-4 p-2 rounded-full text-gray-400 transition-colors z-30">
                  <X className="w-5 h-5" />
                </button>

                <GuestComponentBlur
                  actionText={SECONDARY_UNWRAP_CTA}
                  supportText="Create a free profile before adding Gum Drops to your stash."
                >
                  {!success ? (
                    <div>
                      <div className="text-center mb-6 pt-2">
                        <div className="w-14 h-14 bg-gradient-to-tr from-brand-purple to-brand-purple rounded-2xl mx-auto mb-3 flex items-center justify-center shadow-lg shadow-brand-purple/20">
                          <Candy className="w-7 h-7 text-white drop-shadow-md" />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-0.5 tracking-tight">Kandy Shop Wallet</h2>
                        <p className="text-gray-400 text-xs font-medium mb-3">Get more GumDrops to Unwrap more!</p>
                        {userProfile?.gumDropsBalance !== undefined && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-full">
                            <Candy className="w-3.5 h-3.5 text-brand-purple" />
                            <span className="text-xs font-bold text-white shadow-sm">{userProfile.gumDropsBalance.toLocaleString()} balance</span>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-8">
                        {PACKAGES.map((pkg, index) => {
                          const isSelected = selectedPackage.drops === pkg.drops;
                          const isPopular = index === 1;
                          return (
                            <button
                              key={pkg.drops}
                              onClick={() => {
                                setSelectedPackage(pkg);
                                const pkgEconomics = deriveGumdropEconomics(pkg.drops, pkg.price);
                                trackEvent("purchase_package_selected", {
                                  package_label: pkg.label,
                                  package_drops: pkg.drops,
                                  package_price: pkg.price,
                                  package_paid_drops: pkgEconomics.paidGumDrops,
                                  package_bonus_drops: pkgEconomics.bonusGumDrops,
                                });
                              }}
                              className={cn(
                                "relative p-3 rounded-2xl text-left border flex flex-col justify-center",
                                isSelected
                                  ? "bg-brand-purple/10 border-brand-purple/50 ring-1 ring-brand-purple/30 shadow-[0_0_20px_rgba(236,72,153,0.15)] scale-[1.02]"
                                  : "bg-white/5 border-white/5 hover:bg-white/10 transition-colors"
                              )}
                            >
                              <div className="flex justify-between items-center w-full mb-0.5">
                                <span className="font-bold text-lg text-white">{pkg.drops}</span>
                                <span className={cn("font-bold text-sm", isSelected ? "text-brand-purple" : "text-white")}>${pkg.price.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between items-center w-full">
                                <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider line-clamp-1">{pkg.label}</span>
                                {pkg.bonus && <span className="text-[10px] font-bold text-[#8fff9d] whitespace-nowrap ml-1">{pkg.bonus}</span>}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          selectBundlePackage(customDrops);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            selectBundlePackage(customDrops);
                          }
                        }}
                        className={cn(
                          "relative w-full p-3 mb-6 rounded-2xl text-left border flex flex-col justify-center gap-1.5 transition-all cursor-pointer mt-3",
                          isBundleSelected
                            ? "bg-brand-purple/10 border-brand-purple/50 ring-1 ring-brand-purple/30 shadow-[0_0_20px_rgba(236,72,153,0.15)] scale-[1.02]"
                            : "bg-white/5 border-white/5 hover:bg-white/10"
                        )}
                      >
                        <div className="flex justify-between items-center w-full">
                          <div className="flex items-center">
                            <span className="font-bold text-[22px] text-white">{customDrops.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-1.5 bg-black/40 rounded-xl p-0.5 border border-white/10 shrink-0">
                            <button
                              aria-label="Decrease bundle size"
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateBundleDrops(-1000);
                              }}
                              disabled={!canDecreaseBundle && isBundleSelected}
                              className={cn(
                                "w-8 h-8 rounded-lg flex flex-col items-center justify-center text-white transition-colors cursor-pointer",
                                !canDecreaseBundle && isBundleSelected ? "opacity-30 cursor-not-allowed bg-white/5" : "bg-white/10 hover:bg-white/20"
                              )}
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <div className="w-8 text-center text-sm font-bold text-white">{customDrops / 1000}k</div>
                            <button
                              aria-label="Increase bundle size"
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateBundleDrops(1000);
                              }}
                              disabled={!canIncreaseBundle && isBundleSelected}
                              className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center text-white transition-colors cursor-pointer mr-0.5",
                                !canIncreaseBundle && isBundleSelected ? "opacity-30 cursor-not-allowed bg-brand-purple/30" : "bg-brand-purple/80 hover:bg-brand-purple"
                              )}
                            >
                              <Plus className="w-4 h-4 font-bold" />
                            </button>
                          </div>
                        </div>

                        <div className="flex justify-between items-center w-full mt-0.5">
                          <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider flex items-center gap-2">
                            King Size Bundle
                            <span className="bg-[#8fff9d]/20 text-[#8fff9d] px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide">100% Extra Value</span>
                          </span>
                          <span className={cn("font-bold text-sm", isBundleSelected ? "text-brand-purple" : "text-white")}>
                            ${((customDrops / 1000) * 5).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <div className="w-full relative z-10">
                        {!PAYPAL_READY ? (
                          <div className="rounded-xl border border-brand-purple/30 bg-brand-purple/10 p-3 text-xs text-brand-purple">
                            PayPal is not configured. Real payments require NEXT_PUBLIC_PAYPAL_CLIENT_ID_LIVE to be set.
                          </div>
                        ) : paypalFailed ? (
                          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
                            We couldn&apos;t load PayPal right now. Close and reopen Wallet to retry.
                          </div>
                        ) : !paypalReady || paypalLoading ? (
                          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                            <div className="h-4 w-32 bg-white/10 rounded mb-3 animate-pulse" />
                            <div className="h-12 w-full bg-white/10 rounded-lg animate-pulse" />
                          </div>
                        ) : (
                          <PayPalButtons
                            forceReRender={[selectedPriceKey]}
                            style={{ layout: "vertical", color: "white", shape: "rect", label: "pay", height: 48 }}
                            disabled={processing}
                            createOrder={async () => {
                              startTimedFlow(CHECKOUT_FLOW_KEY, {
                                package_label: selectedPackage.label,
                                package_drops: selectedPackage.drops,
                                package_price: selectedPackage.price,
                              });
                              trackEvent("begin_checkout", {
                                package_label: selectedPackage.label,
                                package_drops: selectedPackage.drops,
                                package_price: selectedPackage.price,
                              });
                              try {
                                const response = await authFetch("/api/paypal/create", {
                                  method: "POST",
                                  body: JSON.stringify({ expectedDrops: selectedPackage.drops }),
                                });

                                const order = await response.json();

                                if (!response.ok) {
                                  toast.error(order.error || "Failed to initialize payment.");
                                  throw new Error(order.error || "Failed to initialize payment.");
                                }

                                return order.id;
                              } catch (error) {
                                reportClientIssue({
                                  channel: "payments",
                                  message: "PayPal order initialization failed",
                                  error,
                                  detail: {
                                    stage: "create_order",
                                    packageLabel: selectedPackage.label,
                                    packageDrops: selectedPackage.drops,
                                    packagePrice: selectedPackage.price,
                                  },
                                  consoleLabel: "[Wallet] PayPal order initialization failed",
                                });
                                throw error;
                              }
                            }}
                            onApprove={async (data) => {
                              if (data.orderID) await handleApprove(data.orderID);
                            }}
                            onError={() => {
                              const message = "PayPal encountered an error. Please try again.";
                              reportClientIssue({
                                channel: "payments",
                                severity: "warn",
                                message: "PayPal checkout surface errored",
                                detail: {
                                  stage: "paypal_buttons",
                                  packageLabel: selectedPackage.label,
                                  packageDrops: selectedPackage.drops,
                                  packagePrice: selectedPackage.price,
                                },
                                consoleLabel: "[Wallet] PayPal buttons error",
                              });
                              setError(message);
                            }}
                          />
                        )}
                      </div>

                      {error && <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-center text-xs font-bold">{error}</div>}
                    </div>
                  ) : (
                    <div className="text-center py-10 pt-4">
                      <div className="w-20 h-20 bg-brand-purple/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(164,118,255,0.35)]">
                        <Candy className="w-10 h-10 text-brand-purple drop-shadow-md" />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-purple">Wallet refilled</p>
                      <h3 className="mt-2 text-3xl font-bold text-white tracking-tight">Your Gum Drops are ready</h3>
                        <p className="mt-3 text-gray-300 max-w-[280px] mx-auto leading-6">
                          You just added <strong>{creditedDropsValue} Gum Drops</strong>. Your next unwrap is one tap away.
                        </p>
                        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                          <span className="rounded-full border border-brand-purple/30 bg-brand-purple/15 px-3 py-1 text-xs font-bold text-white">
                            +{creditedDropsValue} GD
                          </span>
                        {selectedEconomics.bonusGumDrops > 0 ? (
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-gray-200">
                            +{selectedEconomics.bonusGumDrops} bonus
                          </span>
                        ) : null}
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-gray-200">
                          ${selectedPackage.price.toFixed(2)} secured
                        </span>
                      </div>
                      <div className="mt-6 grid gap-2">
                        <button
                          onClick={() => continueFromSuccess("/drops", "wallet_success_unwrap")}
                          className="w-full rounded-2xl border border-brand-purple bg-brand-purple px-4 py-3 font-bold text-white transition-opacity hover:opacity-90"
                        >
                          Unwrap now
                        </button>
                        <button
                          onClick={() => continueFromSuccess("/experiences", "wallet_success_experiences")}
                          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-bold text-white transition-colors hover:bg-white/10"
                        >
                          Keep the streak going
                        </button>
                      </div>
                      <div className="mt-4 flex justify-center">
                        <ReportBugButton context="wallet-success" />
                      </div>
                    </div>
                  )}
                </GuestComponentBlur>
              </motion.div>
            </div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
