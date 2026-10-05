"use client";
import { FUNDING, PayPalButtons } from "@paypal/react-paypal-js";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { GroupedList } from "@/components/ui/content-layout";
import { toast } from "sonner";
import { authFetch } from "@/lib/authFetch";
import { GuestComponentBlur } from "@/components/Auth/GuestComponentBlur";
import { HumanErrorNotice } from "@/components/errors/HumanErrorNotice";
import { startTimedFlow, trackEvent } from "@/lib/telemetry";
import { SECONDARY_UNWRAP_CTA } from "@/lib/marketing-copy";
import { deriveGumdropEconomics } from "@/lib/gumdrop-economics";
import { ReportBugButton } from "@/components/Feedback/ReportBugButton";
import { reportClientIssue } from "@/lib/client-error-reporting";
import { formatCompactGd } from "@/lib/gumdrop-formatting";
import { resolveBundlePromoOffer, resolvePurchaseBonusPromoOffer } from "@/lib/wallet/purchase-promo-contract";
import { buildBugReportContext, getSafePreviousRoute, resolveClientActionError } from "@/lib/errors/client-error-adapter";
import { KandyWalletCheckoutProvider, KandyWalletCheckoutReview, KandyWalletPurchaseSequence } from "@/components/creative-tim/kandydrops/wallet/KandyWalletCheckoutPanel";
import { KandyWalletModalFrame } from "@/components/creative-tim/kandydrops/wallet/KandyWalletModalFrame";
import { KandyWalletBundleStepper, KandyWalletHeader, KandyWalletPackageOption } from "@/components/creative-tim/kandydrops/wallet/KandyWalletPackagePicker";
import { KandyWalletSuccessState } from "@/components/creative-tim/kandydrops/wallet/KandyWalletSuccessState";
import { useWalletPurchase, PACKAGES, PAYPAL_READY, CHECKOUT_FLOW_KEY } from "@/hooks/useWalletPurchase";

export function PurchaseModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { userProfile, router, selectedPackage, setSelectedPackage, customDrops, processing, error, setError, humanPaymentError, setHumanPaymentError, success, bugReporter, networkOnline, paypalReady, paypalLoading, paypalFailed, isBundleSelected, canDecreaseBundle, canIncreaseBundle, walletBalanceSplit, walletDensityPayload, closeModal, continueFromSuccess, selectedPriceKey, selectedEconomics, creditedDropsValue, selectBundlePackage, updateBundleDrops, handleApprove, legacyPaymentDescriptor } = useWalletPurchase({ isOpen, onClose });
  return (
    <KandyWalletModalFrame
      isOpen={isOpen}
      busy={processing}
      onRequestClose={closeModal}
      closeControl={(
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={processing}
          aria-label="Close modal"
          onClick={() => closeModal("wallet_close_button")}
          className="absolute right-2 top-2"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </Button>
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
                      <GroupedList aria-label="Refill packages" data-wallet-mobile-density="compact" data-payment-module-density="compact-v2">
                        {PACKAGES.map((pkg) => {
                          const isSelected = selectedPackage.drops === pkg.drops;
                          const pkgEconomics = deriveGumdropEconomics(pkg.drops, pkg.price);
                          return (
                            <KandyWalletPackageOption
                              key={pkg.drops}
                              amount={pkg.drops}
                              label={pkg.label}
                              price={pkg.price}
                              promo={resolvePurchaseBonusPromoOffer(pkgEconomics.bonusGumDrops)}
                              selected={isSelected}
                              disabled={processing}
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
                      <KandyWalletPackageOption
                        amount={customDrops}
                        label="King Size Bundle"
                        price={(customDrops / 1000) * 5}
                        promo={resolveBundlePromoOffer(customDrops >= 5000)}
                        selected={isBundleSelected}
                        disabled={processing}
                        aria-label={`Select King Size Bundle with ${customDrops.toLocaleString()} Gum Drops`}
                        onSelect={() => {
                          selectBundlePackage(customDrops);
                        }}
                      >
                        {isBundleSelected ? (
                          <KandyWalletBundleStepper
                            sizeLabel={String(customDrops / 1000) + "k"}
                            canDecrease={canDecreaseBundle && !processing}
                            canIncrease={canIncreaseBundle && !processing}
                            onDecrease={() => updateBundleDrops(-1000)}
                            onIncrease={() => updateBundleDrops(1000)}
                          />
                        ) : null}
                            </KandyWalletPackageOption>
                      </GroupedList>
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
                            {processing ? <p role="status" className="text-sm text-muted-foreground">Confirming your payment…</p> : null}
{!networkOnline ? (
                          <div className="rounded-xl border border-border bg-secondary p-3 text-sm text-foreground text-center">
                            You are offline. Please check your network to complete the purchase.
                          </div>
                        ) : !PAYPAL_READY ? (
                          <div className="rounded-xl border border-border bg-secondary p-3 text-sm text-foreground text-center">
                            Checkout is unavailable right now. Please try again later.
                          </div>
                        ) : paypalFailed ? (
                          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive text-center">
                            We couldn&apos;t load the payment provider right now. Close and reopen Wallet to retry.
                          </div>
                        ) : !paypalReady || paypalLoading ? (
                          <div
                            className="rounded-xl border border-border bg-secondary p-2.5"
                            data-wallet-checkout-density="single-button"
                          >
                            <div className="h-[45px] w-full bg-muted rounded-full animate-pulse motion-reduce:animate-none" />
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
