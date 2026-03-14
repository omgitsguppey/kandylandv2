"use client";

import { Home, Candy, Wallet, Sparkles, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { trackEvent } from "@/lib/telemetry";

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
            className="pointer-events-none fixed inset-x-0 z-40 px-3 md:hidden sm:px-4"
            style={{ bottom: "calc(env(safe-area-inset-bottom) + 0.45rem)" }}
        >
            <nav
                className="pointer-events-auto mx-auto flex max-w-7xl items-center justify-between rounded-[1.7rem] border border-white/10 bg-black/68 px-1.5 py-1.5 shadow-[0_18px_48px_rgba(0,0,0,0.42)] backdrop-blur-2xl sm:px-2 sm:py-2"
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
                            data-onboarding-target={`${item.label.toLowerCase()}-nav`}
                            onClick={() => {
                                triggerHaptic();
                                trackEvent('navigation_click', { destination: item.href, source: 'mobile_bottom_bar' });
                            }}
                            className={cn(
                                "flex min-h-[4.1rem] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-[1.15rem] px-1.5 py-2 text-center transition-colors active:scale-95 sm:min-h-[4.35rem] sm:gap-1 sm:px-2 sm:py-2.5",
                                isActive ? "bg-brand-purple/10 text-brand-purple" : "text-gray-400"
                            )}
                        >
                            <Icon className="h-[1.05rem] w-[1.05rem] shrink-0 sm:h-[1.18rem] sm:w-[1.18rem]" />
                            <span className="truncate text-[9px] font-semibold leading-tight sm:text-[10px]">{item.label}</span>
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
                        "flex min-h-[4.1rem] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-[1.15rem] px-1.5 py-2 text-center transition-colors active:scale-95 sm:min-h-[4.35rem] sm:gap-1 sm:px-2 sm:py-2.5",
                        isPurchaseModalOpen ? "bg-brand-purple/10 text-brand-purple" : "text-gray-400"
                    )}
                >
                    <Wallet className="h-[1.05rem] w-[1.05rem] shrink-0 sm:h-[1.18rem] sm:w-[1.18rem]" />
                    <span className="truncate text-[9px] font-semibold leading-tight sm:text-[10px]">Wallet</span>
                </button>
            </nav>
        </div>
    );
}
