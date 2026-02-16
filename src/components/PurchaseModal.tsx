"use client";

import { useState, useEffect } from "react";
import { PayPalButtons, usePayPalScriptReducer, SCRIPT_LOADING_STATE, DISPATCH_ACTION } from "@paypal/react-paypal-js";
import { X, Candy } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { authFetch } from "@/lib/authFetch";

interface PurchaseModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const PACKAGES = [
    { drops: 100, price: 1.00, label: "Starter Pack" },
    { drops: 550, price: 5.00, label: "Fan Pack (+50 Bonus)" },
    { drops: 1100, price: 10.00, label: "Premium Stash (+100 Bonus)" },
    { drops: 2500, price: 20.00, label: "Ultimate Kandy (+500 Bonus)" },
];

export function PurchaseModal({ isOpen, onClose }: PurchaseModalProps) {
    const { user } = useAuth();
    const [selectedPackage, setSelectedPackage] = useState(PACKAGES[1]);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Lazy Load PayPal Script
    const [{ isResolved, isPending }, dispatch] = usePayPalScriptReducer();

    useEffect(() => {
        if (isOpen && !isResolved && !isPending && dispatch) {
            dispatch({
                type: DISPATCH_ACTION.LOADING_STATUS,
                value: SCRIPT_LOADING_STATE.PENDING
            });
        }
    }, [isOpen, isResolved, isPending, dispatch]);

    // Scroll Lock
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleApprove = async (orderId: string) => {
        setProcessing(true);
        setError(null);
        try {
            if (!user) throw new Error("User not authenticated");

            // Server-side capture & verification
            const response = await authFetch("/api/paypal/capture", {
                method: "POST",
                body: JSON.stringify({
                    orderId,
                    expectedDrops: selectedPackage.drops,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Payment verification failed");
            }

            if (result.duplicate) {
                toast.info("This payment was already processed.");
            }

            // Analytics (non-critical, fire-and-forget)
            if (typeof window !== "undefined") {
                import("firebase/analytics").then(({ getAnalytics, logEvent }) => {
                    const analytics = getAnalytics();
                    logEvent(analytics, "purchase", {
                        currency: "USD",
                        value: selectedPackage.price,
                        transaction_id: orderId,
                        items: [{ item_name: selectedPackage.label, quantity: 1 }]
                    });
                }).catch(() => { });
            }

            // Celebrate
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });

            setSuccess(true);
            toast.success(`${result.drops || selectedPackage.drops} Gum Drops added!`);
        } catch (err: any) {
            console.error("Purchase error:", err);
            setError(err.message || "Purchase failed. Please contact support.");
            toast.error("Purchase failed", { description: err.message });
        } finally {
            setProcessing(false);
        }
    };

    return (
        isOpen ? (
            <>
                {/* Fixed Backdrop */}
                <div
                    className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md"
                    onClick={() => {
                        setSuccess(false);
                        onClose();
                    }}
                    aria-hidden="true"
                />

                {/* Scrollable Container */}
                <div className="fixed inset-0 z-50 overflow-y-auto pointer-events-none">
                    <div className="flex min-h-full items-center justify-center p-4">
                        {/* Modal Content */}
                        <div
                            className="relative w-full max-w-md bg-black/50 backdrop-blur-3xl rounded-3xl p-6 md:p-8 shadow-2xl border border-white/10 pointer-events-auto"
                        >
                            <button
                                onClick={() => {
                                    setSuccess(false);
                                    onClose();
                                }}
                                className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors z-20"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            {!success ? (
                                <div key="form">
                                    <div className="text-center mb-8">
                                        <div
                                            className="w-16 h-16 bg-gradient-to-tr from-brand-pink to-brand-purple rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-brand-pink/20"
                                        >
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
                                                            : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10"
                                                    )}
                                                >
                                                    {isPopular && (
                                                        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-brand-cyan to-blue-500 text-[8px] md:text-[10px] font-bold px-1.5 md:px-2 py-0.5 rounded-full text-white shadow-lg border border-white/10 tracking-wide uppercase whitespace-nowrap">
                                                            Best Value
                                                        </span>
                                                    )}
                                                    <div className="font-bold text-lg text-white mb-0.5">{pkg.drops}</div>
                                                    <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">{pkg.label}</div>
                                                    <div className={cn(
                                                        "font-bold",
                                                        isSelected ? "text-brand-pink" : "text-white"
                                                    )}>
                                                        ${pkg.price}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <div className="w-full min-h-[150px] relative z-10">
                                        <PayPalButtons
                                            forceReRender={[selectedPackage.price]}
                                            style={{ layout: "vertical", color: "white", shape: "rect", label: "pay", height: 48 }}
                                            createOrder={(data, actions) => {
                                                return actions.order.create({
                                                    intent: "CAPTURE",
                                                    purchase_units: [
                                                        {
                                                            description: `${selectedPackage.drops} Gum Drops - Virtual Currency`,
                                                            amount: {
                                                                currency_code: "USD",
                                                                value: selectedPackage.price.toString(),
                                                            },
                                                            custom_id: `${user?.uid || 'guest'}:${selectedPackage.drops}`, // Pass UID for Webhook Verification
                                                        },
                                                    ],
                                                });
                                            }}
                                            onApprove={async (data) => {
                                                // Server captures & verifies — never capture client-side
                                                if (data.orderID) {
                                                    await handleApprove(data.orderID);
                                                }
                                            }}
                                            onError={(err) => {
                                                console.error("PayPal Error:", err);
                                                toast.error("PayPal encountered an error", {
                                                    description: "Please try again."
                                                });
                                                setError("PayPal encountered an error. Please try again.");
                                            }}
                                        />
                                        <div className="text-[10px] text-gray-500 text-center mt-4 leading-tight">
                                            By purchasing, you agree to our <a href="/terms" target="_blank" className="underline hover:text-white">Terms</a> and <a href="/privacy" target="_blank" className="underline hover:text-white">Privacy Policy</a>. Gum Drops are virtual items with no monetary value outside this platform.
                                        </div>
                                    </div>

                                    {error && (
                                        <div
                                            className="mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-center text-xs font-bold"
                                        >
                                            {error}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div
                                    key="success"
                                    className="text-center py-10"
                                >
                                    <div className="w-20 h-20 bg-brand-green/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(20,230,130,0.3)]">
                                        <Candy className="w-10 h-10 text-brand-green drop-shadow-md" />
                                    </div>
                                    <h3 className="text-3xl font-bold text-white mb-2 tracking-tight">All Set!</h3>
                                    <p className="text-gray-400 mb-8 max-w-[200px] mx-auto">
                                        You've added <strong>{selectedPackage.drops} Gum Drops</strong> to your stash.
                                    </p>
                                    <button
                                        onClick={() => {
                                            setSuccess(false);
                                            onClose();
                                        }}
                                        className="w-full py-3 rounded-xl font-bold bg-white text-black hover:bg-gray-100 transition-colors"
                                    >
                                        Awesome
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </>
        ) : null
    );
}
