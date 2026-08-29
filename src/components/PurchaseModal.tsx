"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { FUNDING, PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { authFetch } from "@/lib/authFetch";
import { GuestComponentBlur } from "@/components/Auth/GuestComponentBlur";
import { HumanErrorNotice } from "@/components/errors/HumanErrorNotice";
import { clearTimedFlow, consumeTimedFlow, startTimedFlow, trackEvent } from "@/lib/telemetry";
import { SECONDARY_UNWRAP_CTA } from "@/lib/marketing-copy";
import { useUI } from "@/context/UIContext";
import { useSubmitBugReport } from "@/hooks/useSubmitBugReport";
import { deriveGumdropEconomics } from "@/lib/gumdrop-economics";
import { ReportBugButton } from "@/components/Feedback/ReportBugButton";
import { dispatchActivitySync } from "@/lib/activity-sync";
import { FIXED_GUMDROP_PACKAGES } from "@/lib/gumdrops-packages";
import type { DailyTasksState } from "@/lib/tasks/task-catalog";
import { reportClientIssue } from "@/lib/client-error-reporting";
import { formatCompactGd, resolveWalletBalanceSplit } from "@/lib/gumdrop-formatting";
import { createStaleRequestGuard } from "@/lib/frontend-hardening/ui/loading-state-contract";
import { getPaymentProblemCopy } from "@/lib/problem-state-copy";
import {
  resolveBundlePromoOffer,
  resolvePurchaseBonusPromoOffer,
} from "@/lib/wallet/purchase-promo-contract";
import {
  buildBugReportContext,
  getSafePreviousRoute,
  resolveClientActionError,
  type ResolvedClientActionError,
} from "@/lib/errors/client-error-adapter";
import {
  KandyWalletCheckoutProvider,
  KandyWalletCheckoutReview,
  KandyWalletPurchaseSequence,
} from "@/components/creative-tim/kandydrops/wallet/KandyWalletCheckoutPanel";
import { KandyWalletModalFrame } from "@/components/creative-tim/kandydrops/wallet/KandyWalletModalFrame";
import {
  KandyWalletBundleStepper,
  KandyWalletHeader,
  KandyWalletPackageOption,
} from "@/components/creative-tim/kandydrops/wallet/KandyWalletPackagePicker";
import { KandyWalletSuccessState } from "@/components/creative-tim/kandydrops/wallet/KandyWalletSuccessState";

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type PurchasePackage = { drops: number; price: number; label: string; isPopular?: boolean };

const PACKAGES: PurchasePackage[] = FIXED_GUMDROP_PACKAGES.map((entry) => ({
  drops: entry.drops,
  price: entry.priceUsd,
  label: entry.label,
}));

const PAYPAL_READY = (process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID_LIVE?.trim()?.length ?? 0) > 0;
const CHECKOUT_FLOW_KEY = "wallet_checkout";

export function PurchaseModal({ isOpen, onClose }: PurchaseModalProps) {
  const { user, userProfile, setUserProfile } = useAuth();
  const { preferredPurchaseDrops } = useUI();
  const router = useRouter();
  const [packagesList, setPackagesList] = useState<PurchasePackage[]>(PACKAGES);
  const [packagesLoaded, setPackagesLoaded] = useState(false);
  const [networkOnline, setNetworkOnline] = useState(true);
  
  const [selectedPackage, setSelectedPackage] = useState<PurchasePackage>(PACKAGES[1]);
  const [customDrops, setCustomDrops] = useState<number>(5000);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [humanPaymentError, setHumanPaymentError] = useState<ResolvedClientActionError | null>(null);
  const [success, setSuccess] = useState(false);
  const [creditedDrops, setCreditedDrops] = useState<number | null>(null);
  const bugReporter = useSubmitBugReport();
  const [{ isPending }] = usePayPalScriptReducer();
  
  const paypalReady = PAYPAL_READY && networkOnline;
  const paypalLoading = isPending;
  const paypalFailed = false;
  const hasTrackedOpenRef = useRef(false);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const packagesRequestGuardRef = useRef(createStaleRequestGuard());
  const legacyPaymentDescriptor = useMemo(() => {
    if (!error) {
      return null;
    }

    const safeCopy = getPaymentProblemCopy(error);
    const resolved = resolveClientActionError({ errorKey: "payment_not_completed" }, {
      surface: "gumdrop_purchase",
      route: "/api/paypal/capture",
      fallbackKey: "payment_not_completed",
      context: { source: "purchase_modal_legacy_error" },
    });

    return {
      ...resolved.descriptor,
      userTitle: safeCopy.headline,
      userMessage: safeCopy.body,
      debugOnlyDetails: [
        ...(resolved.descriptor.debugOnlyDetails ?? []),
        `safe_payment_copy:${safeCopy.technicalReason}`,
      ],
    };
  }, [error]);

  useEffect(() => {
    setNetworkOnline(navigator.onLine);
    const handleOnline = () => setNetworkOnline(true);
    const handleOffline = () => setNetworkOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!isOpen || packagesLoaded) return;
    const requestId = packagesRequestGuardRef.current.next();
    const controller = new AbortController();
    fetch('/api/wallet/packages', { signal: controller.signal })
      .then(res => res.json())
      .then(data => {
         if (!packagesRequestGuardRef.current.isFresh(requestId)) return;
         if (data.packages && Array.isArray(data.packages)) {
             const loaded = data.packages.map((entry: any) => ({
                 drops: entry.drops,
                 price: entry.priceUsd,
                 label: entry.label,
             }));
             setPackagesList(loaded);
             if (!loaded.find((p: any) => p.drops === selectedPackage.drops)) {
                 setSelectedPackage(loaded[1] || loaded[0]);
             }
         }
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        reportClientIssue({
          channel: "payments",
          severity: "warn",
          message: "Failed to load dynamic wallet packages",
          error: err,
          consoleLabel: "[Wallet] Failed to load dynamic packages",
        });
      })
      .finally(() => {
        if (packagesRequestGuardRef.current.isFresh(requestId)) {
          setPackagesLoaded(true);
        }
      });
    return () => controller.abort();
  }, [isOpen, packagesLoaded, selectedPackage.drops]);
  const isBundleSelected = selectedPackage.label === "King Size Bundle";
  const canDecreaseBundle = customDrops > 5000;
  const canIncreaseBundle = customDrops < 100000;
  const walletBalanceSplit = useMemo(() => resolveWalletBalanceSplit(userProfile), [userProfile]);
  const walletDensityPayload = useMemo(() => ({
    balance_free_gd: walletBalanceSplit.freeGd,
    balance_paid_gd: walletBalanceSplit.paidGd,
    balance_total_gd: walletBalanceSplit.totalGd,
    wallet_density: "public-beta-compact" as const,
    source_component: "purchase_modal",
  }), [walletBalanceSplit.freeGd, walletBalanceSplit.paidGd, walletBalanceSplit.totalGd]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const closeModal = useCallback((source: string = "wallet_modal_close") => {
    if (isOpen && !success) {
      trackEvent("wallet_closed_incomplete", {
        package_label: selectedPackage.label,
        package_drops: selectedPackage.drops,
        package_price: selectedPackage.price,
        wallet_close_source: source,
        wallet_close_state: processing ? "checkout_processing" : error ? "error_visible" : "package_selected",
        ...walletDensityPayload,
        source_component: "purchase_modal",
      });
    }

    setSuccess(false);
    setError(null);
    setHumanPaymentError(null);
    setCreditedDrops(null);
    clearTimedFlow(CHECKOUT_FLOW_KEY);
    requestAnimationFrame(onClose);
  }, [
    error,
    isOpen,
    onClose,
    processing,
    selectedPackage.drops,
    selectedPackage.label,
    selectedPackage.price,
    success,
    walletDensityPayload,
  ]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const focusTimer = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);

    return () => window.clearTimeout(focusTimer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeModal("wallet_escape_key");
        return;
      }

      if (event.key !== "Tab" || !modalRef.current) {
        return;
      }

      const focusableElements = Array.from(
        modalRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hasAttribute("disabled") && element.getAttribute("aria-hidden") !== "true");

      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      if (!firstElement || !lastElement) {
        return;
      }

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
        return;
      }

      if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closeModal, isOpen]);

  const continueFromSuccess = useCallback((destination: string, source: string) => {
    trackEvent("navigation_click", {
      destination,
      source,
      source_component: "purchase_modal",
    });
    closeModal("wallet_success_navigation");
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
        ...walletDensityPayload,
        source_component: "purchase_modal",
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
    walletDensityPayload,
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
      ...walletDensityPayload,
      source_component: "purchase_modal",
    });

    return bundle;
  }, [walletDensityPayload]);

  const updateBundleDrops = useCallback((delta: number) => {
    setCustomDrops((prev) => {
      const nextDrops = Math.min(100000, Math.max(5000, prev + delta));
      selectBundlePackage(nextDrops);
      return nextDrops;
    });
  }, [selectBundlePackage]);

  const resolvePreferredPackage = useCallback((drops: number): PurchasePackage => {
    const normalizedDrops = Math.max(1, Math.floor(drops));
    const exactPackage = packagesList.find((pkg) => pkg.drops === normalizedDrops);
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

    return packagesList.find((pkg) => pkg.drops >= normalizedDrops) ?? packagesList[packagesList.length - 1];
  }, [packagesList]);

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
    setHumanPaymentError(null);
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
        transactionId?: string;
        gumDropsBalance?: number | null;
        dailyTasksState?: DailyTasksState | null;
      };
      if (!response.ok) throw resolveClientActionError(result, {
        status: response.status,
        surface: "gumdrop_purchase",
        route: "/api/paypal/capture",
        fallbackKey: "payment_not_completed",
        context: {
          stage: "capture",
          packageLabel: selectedPackage.label,
          packageDrops: selectedPackage.drops,
          packagePrice: selectedPackage.price,
        },
      });

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
      const transactionId = result.transactionId || orderId;

      trackEvent("purchase", {
        order_id: orderId,
        transaction_id: transactionId,
        value: selectedPackage.price,
        currency: "USD",
        sourceTruth: "client_supporting",
        source_component: "purchase_modal",
        items: [{
          item_id: `gumdrops_${selectedPackage.drops}`,
          item_name: selectedPackage.label,
          price: selectedPackage.price,
          quantity: 1
        }]
      });
      trackEvent("gumdrops_purchase_completed", {
        order_id: orderId,
        transaction_id: transactionId,
        package_label: selectedPackage.label,
        package_drops: selectedPackage.drops,
        package_price: selectedPackage.price,
        package_paid_drops: selectedEconomics.paidGumDrops,
        package_bonus_drops: selectedEconomics.bonusGumDrops,
        package_bonus_value_usd: selectedEconomics.bonusValueUsd,
        package_adjusted_profit_usd: selectedEconomics.adjustedProfitUsd,
        package_effective_usd_per_100_gd: selectedEconomics.effectiveUsdPer100Gd,
        sourceTruth: "client_supporting",
        ...walletDensityPayload,
        source_component: "purchase_modal",
        ...(consumeTimedFlow(CHECKOUT_FLOW_KEY).mergedParams ?? {}),
      });
    } catch (err: unknown) {
      const resolved = "descriptor" in (err && typeof err === "object" ? err as Record<string, unknown> : {})
        ? err as ResolvedClientActionError
        : resolveClientActionError(err, {
          surface: "gumdrop_purchase",
          route: "/api/paypal/capture",
          fallbackKey: "payment_not_completed",
          context: {
            stage: "capture",
            packageLabel: selectedPackage.label,
            packageDrops: selectedPackage.drops,
            packagePrice: selectedPackage.price,
          },
        });
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
      setHumanPaymentError(resolved);
      setError(resolved.descriptor.userMessage);
      trackEvent("gumdrops_purchase_failed", {
        order_id: orderId,
        transaction_id: orderId,
        package_label: selectedPackage.label,
        package_drops: selectedPackage.drops,
        package_price: selectedPackage.price,
        package_paid_drops: selectedEconomics.paidGumDrops,
        package_bonus_drops: selectedEconomics.bonusGumDrops,
        sourceTruth: "client",
        ...walletDensityPayload,
        source_component: "purchase_modal",
        ...(consumeTimedFlow(CHECKOUT_FLOW_KEY, { failure_reason: resolved.descriptor.userTitle }).mergedParams ?? {}),
      });
      toast.error(resolved.descriptor.userTitle, { description: resolved.descriptor.userMessage });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <KandyWalletModalFrame
      isOpen={isOpen}
      onBackdropClick={() => closeModal("wallet_backdrop")}
      dialogRef={modalRef}
      closeControl={(
        <button
          ref={closeButtonRef}
          aria-label="Close modal"
          onClick={() => closeModal("wallet_close_button")}
          className={cn(
            "absolute right-3 top-3 z-30 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-violet-100 shadow-inner shadow-white/10 transition hover:bg-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-200/70",
          )}
        >
          <X className="h-5 w-5" />
        </button>
      )}
    >
      <GuestComponentBlur
                  actionText={SECONDARY_UNWRAP_CTA}
                  supportText="Create a free profile before adding Gum Drops to your stash."
                >
                  {!success ? (
                    <div data-payment-module-density="compact-v2">
                                            <KandyWalletPurchaseSequence
                        selection={(
                          <>
                            <KandyWalletHeader
                        hasUserProfile={Boolean(userProfile)}
                        rewardBalanceLabel={formatCompactGd(walletBalanceSplit.freeGd)}
                        paidBalanceLabel={formatCompactGd(walletBalanceSplit.paidGd)}
                      />

                      <div className="flex flex-col gap-1.5 mb-2" data-wallet-mobile-density="compact" data-payment-module-density="compact-v2">
                        {packagesList.map((pkg) => {
                          const isSelected = selectedPackage.drops === pkg.drops;
                          const pkgEconomics = deriveGumdropEconomics(pkg.drops, pkg.price);
                          return (
                            <KandyWalletPackageOption
                              key={pkg.drops}
                              amount={pkgEconomics.paidGumDrops}
                              label={pkg.label}
                              price={pkg.price}
                              promo={resolvePurchaseBonusPromoOffer(pkgEconomics.bonusGumDrops)}
                              selected={isSelected}
                              onSelect={() => {
                                setSelectedPackage(pkg);
                                trackEvent("purchase_package_selected", {
                                  package_label: pkg.label,
                                  package_drops: pkg.drops,
                                  package_price: pkg.price,
                                  package_paid_drops: pkgEconomics.paidGumDrops,
                                  package_bonus_drops: pkgEconomics.bonusGumDrops,
                                  ...walletDensityPayload,
                                  source_component: "purchase_modal",
                                });
                              }}
                            />
                          );
                        })}
                      </div>

                      <KandyWalletPackageOption
                        amount={deriveGumdropEconomics(customDrops, (customDrops / 1000) * 5).paidGumDrops}
                        label="King Size Bundle"
                        price={(customDrops / 1000) * 5}
                        promo={resolveBundlePromoOffer(customDrops >= 5000)}
                        selected={isBundleSelected}
                        aria-label={`Select King Size Bundle with ${customDrops.toLocaleString()} Gum Drops`}
                        onSelect={() => {
                          selectBundlePackage(customDrops);
                        }}
                      >
                        {isBundleSelected ? (
                          <KandyWalletBundleStepper
                            sizeLabel={String(customDrops / 1000) + "k"}
                            canDecrease={canDecreaseBundle}
                            canIncrease={canIncreaseBundle}
                            onDecrease={() => updateBundleDrops(-1000)}
                            onIncrease={() => updateBundleDrops(1000)}
                          />
                        ) : null}
                            </KandyWalletPackageOption>
                          </>
                        )}
                        review={(
                          <KandyWalletCheckoutReview
                            selectedAmount={selectedPackage.drops}
                            selectedPriceLabel={"$" + selectedPackage.price.toFixed(2)}
                          />
                        )}
                        provider={(
                          <KandyWalletCheckoutProvider>
{!networkOnline ? (
                          <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-3 text-xs text-orange-200 text-center font-medium">
                            You are offline. Please check your network to complete the purchase.
                          </div>
                        ) : !PAYPAL_READY ? (
                          <div className="rounded-xl border border-brand-purple/30 bg-brand-purple/10 p-3 text-xs text-brand-purple text-center">
                            Checkout is unavailable right now. Please try again later.
                          </div>
                        ) : paypalFailed ? (
                          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200 text-center">
                            We couldn&apos;t load the payment provider right now. Close and reopen Wallet to retry.
                          </div>
                        ) : !paypalReady || paypalLoading ? (
                          <div
                            className="rounded-xl border border-white/10 bg-white/5 p-2.5"
                            data-wallet-checkout-density="single-button"
                          >
                            <div className="h-[45px] w-full bg-white/10 rounded-full animate-pulse" />
                          </div>
                        ) : (
                          <div
                            className="max-h-[58px] overflow-visible rounded-full"
                            data-wallet-paypal-render-mode="single-funding-source"
                            data-wallet-paypal-funding-source="paypal"
                            data-wallet-paypal-buttons-visible="1"
                            data-wallet-checkout-density="single-button"
                          >
                            <PayPalButtons
                              fundingSource={FUNDING.PAYPAL}
                              forceReRender={[selectedPriceKey, String(selectedPackage.drops), selectedPackage.label]}
                              style={{ layout: "vertical", color: "white", shape: "pill", label: "paypal", height: 45 }}
                              disabled={processing}
                              createOrder={async () => {
                                startTimedFlow(CHECKOUT_FLOW_KEY, {
                                  package_label: selectedPackage.label,
                                  package_drops: selectedPackage.drops,
                                  package_price: selectedPackage.price,
                                  ...walletDensityPayload,
                                });
                                try {
                                  const response = await authFetch("/api/paypal/create", {
                                    method: "POST",
                                    body: JSON.stringify({ expectedDrops: selectedPackage.drops }),
                                  });

                                  const order = await response.json() as {
                                    id?: string;
                                    transactionId?: string;
                                    error?: string;
                                  };

                                  if (!response.ok) {
                                    const resolved = resolveClientActionError(order, {
                                      status: response.status,
                                      surface: "gumdrop_purchase",
                                      route: "/api/paypal/create",
                                      fallbackKey: "provider_unavailable",
                                      context: {
                                        stage: "create_order",
                                        packageLabel: selectedPackage.label,
                                        packageDrops: selectedPackage.drops,
                                        packagePrice: selectedPackage.price,
                                      },
                                    });
                                    setHumanPaymentError(resolved);
                                    setError(resolved.descriptor.userMessage);
                                    toast.error(resolved.descriptor.userTitle, { description: resolved.descriptor.userMessage });
                                    throw new Error(resolved.descriptor.errorKey);
                                  }

                                  trackEvent("begin_checkout", {
                                    order_id: order.id,
                                    transaction_id: order.transactionId || order.id,
                                    package_label: selectedPackage.label,
                                    package_drops: selectedPackage.drops,
                                    package_price: selectedPackage.price,
                                    sourceTruth: "client_funnel",
                                    ...walletDensityPayload,
                                    source_component: "purchase_modal",
                                  });

                                  return order.id || "";
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
                              onError={(err) => {
                                const resolved = resolveClientActionError(err, {
                                  surface: "gumdrop_purchase",
                                  route: "/api/paypal/create",
                                  fallbackKey: "provider_unavailable",
                                  context: {
                                    stage: "paypal_single_button_render",
                                    fundingSource: "paypal",
                                    packageLabel: selectedPackage.label,
                                    packageDrops: selectedPackage.drops,
                                    packagePrice: selectedPackage.price,
                                  },
                                });
                                reportClientIssue({
                                  channel: "payments",
                                  severity: "warn",
                                  message: "PayPal checkout surface errored",
                                  error: err,
                                  detail: {
                                    stage: "paypal_single_button_render",
                                    fundingSource: "paypal",
                                    packageLabel: selectedPackage.label,
                                    packageDrops: selectedPackage.drops,
                                    packagePrice: selectedPackage.price,
                                  },
                                  consoleLabel: "[Wallet] PayPal single button error",
                                });
                                setHumanPaymentError(resolved);
                                setError(resolved.descriptor.userMessage);
                              }}
                            />
                          </div>
                        )}
                          </KandyWalletCheckoutProvider>
                        )}
                      />

                      {humanPaymentError ? (
                        <HumanErrorNotice
                          descriptor={humanPaymentError.descriptor}
                          compact
                          className="mt-4 text-left"
                          onPrimaryAction={(action) => {
                            if (action === "retry") {
                              setError(null);
                              setHumanPaymentError(null);
                            } else if (action === "contact_support") {
                              router.push("/support");
                            }
                          }}
                          onSubmitBug={() => bugReporter.submit(humanPaymentError.descriptor, buildBugReportContext({
                            descriptor: humanPaymentError.descriptor,
                            route: humanPaymentError.route,
                            previousRoute: getSafePreviousRoute(),
                            extra: humanPaymentError.context,
                          }))}
                        />
                      ) : legacyPaymentDescriptor ? (
                        <HumanErrorNotice
                          descriptor={legacyPaymentDescriptor}
                          compact
                          className="mt-4 text-left"
                        />
                      ) : null}
                    </div>
                  ) : (
                    <KandyWalletSuccessState
                      creditedDrops={creditedDropsValue}
                      paidDrops={selectedEconomics.paidGumDrops}
                      bonusDrops={selectedEconomics.bonusGumDrops}
                      securedPriceLabel={"$" + selectedPackage.price.toFixed(2)}
                      onUnwrap={() => continueFromSuccess("/drops", "wallet_success_unwrap")}
                      onExploreExperiences={() => continueFromSuccess("/experiences", "wallet_success_experiences")}
                      reportBugControl={<ReportBugButton context="wallet-success" />}
                    />
                  )}
      </GuestComponentBlur>
    </KandyWalletModalFrame>
  );
}
