"use client";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { usePayPalScriptReducer } from "@paypal/react-paypal-js";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { authFetch } from "@/lib/authFetch";
import { clearTimedFlow, consumeTimedFlow, trackEvent } from "@/lib/telemetry";
import { useUI } from "@/context/UIContext";
import { useSubmitBugReport } from "@/hooks/useSubmitBugReport";
import { deriveGumdropEconomics } from "@/lib/gumdrop-economics";
import { dispatchActivitySync } from "@/lib/activity-sync";
import { FIXED_GUMDROP_PACKAGES } from "@/lib/gumdrops-packages";
import type { DailyTasksState } from "@/lib/tasks/task-catalog";
import { reportClientIssue } from "@/lib/client-error-reporting";
import { resolveWalletBalanceSplit } from "@/lib/gumdrop-formatting";
import { getPaymentProblemCopy } from "@/lib/problem-state-copy";
import { resolveClientActionError, type ResolvedClientActionError } from "@/lib/errors/client-error-adapter";

type PurchasePackage = { drops: number; price: number; label: string; isPopular?: boolean };

export const PACKAGES: PurchasePackage[] = FIXED_GUMDROP_PACKAGES.map((entry) => ({
  drops: entry.drops,
  price: entry.priceUsd,
  label: entry.label,
}));

export const PAYPAL_READY = (process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID_LIVE?.trim()?.length ?? 0) > 0;
export const CHECKOUT_FLOW_KEY = "wallet_checkout";

export function useWalletPurchase({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user, userProfile, setUserProfile } = useAuth();
  const { preferredPurchaseDrops } = useUI();
  const router = useRouter();
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

  return { userProfile, router, selectedPackage, setSelectedPackage, customDrops, processing, error, setError, humanPaymentError, setHumanPaymentError, success, bugReporter, networkOnline, paypalReady, paypalLoading, paypalFailed, isBundleSelected, canDecreaseBundle, canIncreaseBundle, walletBalanceSplit, walletDensityPayload, closeModal, continueFromSuccess, selectedPriceKey, selectedEconomics, creditedDropsValue, selectBundlePackage, updateBundleDrops, handleApprove, legacyPaymentDescriptor };
}
