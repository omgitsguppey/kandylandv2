"use client";

import { Home, Candy, Wallet, Sparkles, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { app } from "@/lib/firebase";
import { getAnalytics, logEvent } from "firebase/analytics";

const NAV_ITEMS = [
    { label: "Home", href: "/", icon: Home },
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Drops", href: "/drops", icon: Candy },
    { label: "Experiences", href: "/experiences", icon: Sparkles },
] as const;

function triggerHaptic() {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(10);
    }
}

export default function MobileBottomBar() {
    const pathname = usePathname();
    const { user, userProfile } = useAuth();
    const { openPurchaseModal, isPurchaseModalOpen } = useUI();

    if (pathname?.startsWith("/admin")) {
        return null;
    }

    return (
        <div
            className="md:hidden fixed inset-x-0 bottom-0 z-40 px-3 pointer-events-none"
            style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
        >
            <nav
                className="pointer-events-auto max-w-7xl mx-auto bg-black/55 backdrop-blur-xl border border-white/10 rounded-full px-2 py-1.5 flex items-center justify-between shadow-xl shadow-black/40"
                style={{ WebkitBackdropFilter: "blur(20px)" }}
            >
                {NAV_ITEMS.map((item) => {
                    const isAdmin = userProfile?.role === "admin";
                    const isGuest = !user;

                    // Role-based visibility
                    if (item.label === "Dashboard" && isGuest) return null;
                    if (item.label === "Home" && !isGuest && !isAdmin) return null;

                    const Icon = item.icon;
                    const isActive = pathname === item.href;

                    return (
                        <Link
                            key={item.label}
                            href={item.href}
                            onClick={() => {
                                triggerHaptic();
                                try {
                                    const analytics = getAnalytics(app);
                                    logEvent(analytics, 'navigation_click', { destination: item.href, source: 'mobile_bottom_bar' });
                                } catch (e) { }
                            }}
                            className={cn(
                                "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 transition-colors active:scale-95",
                                isActive ? "text-brand-purple" : "text-gray-400"
                            )}
                        >
                            <Icon className="h-5 w-5 shrink-0" />
                            <span className="text-[9px] leading-tight font-medium truncate">{item.label}</span>
                        </Link>
                    );
                })}

                <button
                    type="button"
                    onClick={() => {
                        triggerHaptic();
                        openPurchaseModal();
                    }}
                    className={cn(
                        "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 transition-colors active:scale-95",
                        isPurchaseModalOpen ? "text-brand-purple" : "text-gray-400"
                    )}
                >
                    <Wallet className="h-5 w-5 shrink-0" />
                    <span className="text-[9px] leading-tight font-medium truncate">Wallet</span>
                </button>
            </nav>
        </div>
    );
}
