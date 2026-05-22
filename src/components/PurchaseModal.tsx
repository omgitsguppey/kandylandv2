"use client";

import { useState, useEffect, useMemo, useCallback, useRef, type ReactNode } from "react";
import { FUNDING, PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js";
import { useRouter } from "next/navigation";
import { X, Candy, Minus, Plus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { authFetch } from "@/lib/authFetch";
import { motion, AnimatePresence } from "framer-motion";
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
import { createStaleRequestGuard } from "@/lib/ui/loading-state-contract";
import {
  resolveBundlePromoOffer,
  resolvePurchaseBonusPromoOffer,
  type PurchasePromoOffer,
} from "@/lib/wallet/purchase-promo-contract";
import {
  buildBugReportContext,
  getSafePreviousRoute,
  resolveClientActionError,
  type ResolvedClientActionError,
} from "@/lib/errors/client-error-adapter";

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

type PurchasePackageRowProps = {
  amount: number;
  label: string;
  price: number;
  promo: PurchasePromoOffer | null;
  selected: boolean;
  onSelect: () => void;
  ariaLabel?: string;
  children?: ReactNode;
};

function PurchasePromoBadge({ promo }: { promo: PurchasePromoOffer | null }) {
  if (!promo || !promo.shouldShowOnMobile) {
    return (
      <span
        aria-hidden="true"
        className="mt-1 block h-[1.05rem] min-w-[4.8rem]"
        data-purchase-promo-slot="reserved"
      />
    );
  }

  return (
    <span
      className={cn(
        "mt-1 inline-flex h-[1.05rem] max-w-[6.4rem] items-center justify-center overflow-hidden text-ellipsis whitespace-nowrap rounded-md border border-brand-purple/25 bg-brand-purple/[0.12] px-1.5 text-[8px] font-bold leading-none tracking-normal text-[#d7c4ff]",
        promo.maxWidthClassName,
      )}
      data-purchase-promo-slot="reserved"
      title={promo.label}
    >
      {promo.compactLabel}
    </span>
  );
}

function PurchasePriceBlock({ price, promo, selected }: { price: number; promo: PurchasePromoOffer | null; selected: boolean }) {
  return (
    <div className="flex w-[6.6rem] shrink-0 flex-col items-end justify-center" data-purchase-row-zone="price">
      <span className={cn("text-[14px] font-bold leading-none", selected ? "text-brand-purple" : "text-white")}>
        ${price.toFixed(2)}
      </span>
      <PurchasePromoBadge promo={promo} />
    </div>
  );
}

function PurchasePackageRow({
  amount,
  label,
  price,
  promo,
  selected,
  onSelect,
  ariaLabel,
  children,
}: PurchasePackageRowProps) {
  const className = cn(
    "relative grid min-h-[3.45rem] w-full grid-cols-[2rem_minmax(0,1fr)_6.6rem] items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition-all",
    selected
      ? "border-brand-purple/55 bg-brand-purple/[0.12] ring-1 ring-brand-purple/25"
      : "border-white/5 bg-white/5 hover:bg-white/10 cursor-pointer",
  );
  const content = (
    <>
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
          selected ? "bg-white/10" : "bg-black/40",
        )}
        data-purchase-row-zone="icon"
      >
        <Candy className="h-[1.125rem] w-[1.125rem] text-gray-300" />
      </div>
      <div className="min-w-0" data-purchase-row-zone="copy">
        <div className="flex min-w-0 items-baseline gap-1.5">
          <span className="truncate text-[14px] font-bold leading-none text-white">{amount.toLocaleString()}</span>
          <span className="shrink-0 text-[9px] font-bold leading-none text-gray-500">Paid GD</span>
        </div>
        <p className="mt-0.5 truncate text-[10.5px] font-medium leading-tight text-gray-400">{label}</p>
      </div>
      <PurchasePriceBlock price={price} promo={promo} selected={selected} />
      {children}
    </>
  );

  if (children) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect();
          }
        }}
        aria-pressed={selected}
        aria-label={ariaLabel}
        data-wallet-mobile-density="compact"
        data-payment-module-density="compact-v2"
        className={className}
      >
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={ariaLabel}
      data-wallet-mobile-density="compact"
      data-payment-module-density="compact-v2"
      className={className}
    >
      {content}
    </button>
  );
}

function PurchaseModalHeader({
  hasUserProfile,
  freeGd,
  paidGd,
}: {
  hasUserProfile: boolean;
  freeGd: number;
  paidGd: number;
}) {
  return (
    <div className="text-center mb-2 pt-0.5" data-wallet-mobile-density="compact" data-payment-module-density="compact-v2">
      <div className="w-9 h-9 bg-gradient-to-tr from-brand-purple to-brand-purple rounded-[0.9rem] mx-auto mb-1.5 flex items-center justify-center shadow-lg shadow-brand-purple/15 sm:h-11 sm:w-11 sm:rounded-2xl">
        <Candy className="h-[1.125rem] w-[1.125rem] text-white drop-shadow-md sm:h-5 sm:w-5" />
      </div>
      <h2 id="purchase-wallet-title" className="text-lg font-bold text-white mb-0.5 tracking-tight">Kandy Shop Wallet</h2>
      <p className="text-gray-400 text-[11px] font-medium mb-1.5 leading-snug">Refill GumDrops for your next unwrap.</p>
      {hasUserProfile ? (
        <div
          className="inline-flex items-center gap-2 px-2.5 py-1 bg-white/5 border border-white/10 rounded-full"
          data-wallet-mobile-density="compact"
          aria-label={`Wallet balance: ${formatCompactGd(freeGd)} free GD, ${formatCompactGd(paidGd)} paid GD`}
        >
          <Candy className="w-3.5 h-3.5 text-brand-purple" />
          <span className="text-[11px] font-bold text-white shadow-sm">{formatCompactGd(freeGd)} free GD</span>
          <span className="text-[11px] font-bold text-white/25" aria-hidden="true">|</span>
          <span className="text-[11px] font-bold text-white shadow-sm">{formatCompactGd(paidGd)} paid GD</span>
        </div>
      ) : null}
    </div>
  );
}

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
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => closeModal("wallet_backdrop")} aria-hidden="true" />
          <div className="fixed inset-0 z-50 overflow-y-auto pointer-events-none">
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                ref={modalRef}
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
                className="relative w-full max-w-[23rem] bg-black/45 backdrop-blur-xl rounded-[1.35rem] p-3.5 shadow-2xl border border-white/10 pointer-events-auto sm:max-w-md sm:rounded-[1.6rem] sm:p-4 md:p-5"
              >
                <button ref={closeButtonRef} aria-label="Close modal" onClick={() => closeModal("wallet_close_button")} className="absolute top-3 right-3 flex h-11 w-11 items-center justify-center rounded-full text-gray-400 transition-colors z-30">
                  <X className="w-5 h-5" />
                </button>

                <GuestComponentBlur
                  actionText={SECONDARY_UNWRAP_CTA}
                  supportText="Create a free profile before adding Gum Drops to your stash."
                >
                  {!success ? (
                    <div data-payment-module-density="compact-v2">
                      <PurchaseModalHeader
                        hasUserProfile={Boolean(userProfile)}
                        freeGd={walletBalanceSplit.freeGd}
                        paidGd={walletBalanceSplit.paidGd}
                      />

                      <div className="flex flex-col gap-1.5 mb-2" data-wallet-mobile-density="compact" data-payment-module-density="compact-v2">
                        {packagesList.map((pkg) => {
                          const isSelected = selectedPackage.drops === pkg.drops;
                          const pkgEconomics = deriveGumdropEconomics(pkg.drops, pkg.price);
                          return (
                            <PurchasePackageRow
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

                      <PurchasePackageRow
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
                        {isBundleSelected && (
                           <div className="col-span-3 mt-1 flex items-center justify-between gap-3 border-t border-white/5 pt-1.5">
                             <span className="text-[10px] text-gray-400 font-medium tracking-wide">Configure:</span>
                             <div className="flex shrink-0 items-center justify-between w-[118px] rounded-lg border border-white/10 bg-black/40 p-0.5">
                                <button
                                  aria-label="Decrease bundle size"
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateBundleDrops(-1000);
                                  }}
                                  disabled={!canDecreaseBundle}
                                  className={cn(
                                    "flex h-7 w-7 flex-col items-center justify-center rounded-md text-white transition-colors cursor-pointer",
                                    !canDecreaseBundle ? "opacity-30 cursor-not-allowed bg-transparent" : "bg-white/10 hover:bg-white/20"
                                  )}
                                >
                                  <Minus className="h-4 w-4" />
                                </button>
                                <div className="text-center text-[11px] font-bold text-gray-100 px-1">{customDrops / 1000}k</div>
                                <button
                                  aria-label="Increase bundle size"
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateBundleDrops(1000);
                                  }}
                                  disabled={!canIncreaseBundle}
                                  className={cn(
                                    "flex h-7 w-7 items-center justify-center rounded-md text-white transition-colors cursor-pointer",
                                    !canIncreaseBundle ? "opacity-30 cursor-not-allowed bg-brand-purple/30" : "bg-brand-purple/80 hover:bg-brand-purple text-white"
                                  )}
                                >
                                  <Plus className="h-4 w-4 font-bold" />
                                </button>
                             </div>
                           </div>
                        )}
                      </PurchasePackageRow>

                      <div className="w-full relative z-10 mt-2 pt-1.5 pb-0.5 border-t border-white/10 select-none">
                        <div className="mb-2 text-[9px] font-bold text-gray-500 tracking-widest uppercase text-center flex items-center gap-2.5">
                           <div className="flex-1 h-[1px] bg-white/5"></div>
                           <span>Secure Checkout</span>
                           <div className="flex-1 h-[1px] bg-white/5"></div>
                        </div>
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
                      </div>

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
                      ) : error ? (
                        <HumanErrorNotice
                          descriptor={resolveClientActionError({ errorKey: "payment_not_completed" }, {
                            surface: "gumdrop_purchase",
                            route: "/api/paypal/capture",
                            fallbackKey: "payment_not_completed",
                            context: { source: "purchase_modal_legacy_error" },
                          }).descriptor}
                          compact
                          className="mt-4 text-left"
                        />
                      ) : null}
                    </div>
                  ) : (
                    <div className="text-center py-6 pt-3" data-wallet-mobile-density="compact">
                      <div className="w-14 h-14 bg-brand-purple/20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_24px_rgba(164,118,255,0.28)] sm:h-16 sm:w-16">
                        <Candy className="w-7 h-7 text-brand-purple drop-shadow-md sm:h-8 sm:w-8" />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-purple">Wallet refilled</p>
                      <h3 className="mt-2 text-xl font-bold text-white tracking-tight sm:text-2xl">Your Gum Drops are ready</h3>
                        <p className="mt-2 text-sm text-gray-300 max-w-[260px] mx-auto leading-5">
                          You just added <strong>{creditedDropsValue} Gum Drops</strong>. Your next unwrap is one tap away.
                        </p>
                        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                          <span className="rounded-full border border-brand-purple/30 bg-brand-purple/15 px-3 py-1 text-xs font-bold text-white">
                            +{selectedEconomics.paidGumDrops} GD
                          </span>
                        {selectedEconomics.bonusGumDrops > 0 ? (
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-gray-200">
                             +{selectedEconomics.bonusGumDrops} bonus GD
                          </span>
                        ) : null}
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-gray-200">
                          ${selectedPackage.price.toFixed(2)} secured
                        </span>
                      </div>
                      <div className="mt-5 grid gap-2">
                        <button
                          onClick={() => continueFromSuccess("/drops", "wallet_success_unwrap")}
                          className="w-full rounded-xl border border-brand-purple bg-brand-purple px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
                        >
                          Unwrap now
                        </button>
                        <button
                          onClick={() => continueFromSuccess("/experiences", "wallet_success_experiences")}
                          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/10"
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
