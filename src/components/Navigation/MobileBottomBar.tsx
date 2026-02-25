"use client";

import { Home, Candy, Wallet, Search, Sparkles } from "lucide-react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { AnimateBalance } from "./AnimateBalance";


export default function MobileBottomBar() {
    const pathname = usePathname();
    const { user, userProfile } = useAuth();
    const { openPurchaseModal } = useUI();

    // Hide on desktop (md and up) and on admin pages
    if (pathname?.startsWith("/admin")) return null;

    const navItems = [
        { label: "Home", href: "/", icon: Home },
        { label: "Drops", href: "/drops", icon: Candy },
        { label: "Experiences", href: "/experiences", icon: Sparkles },
    ];

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 p-4 pointer-events-none" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>

            <nav className="pointer-events-auto bg-black/55 backdrop-blur-xl border border-white/10 rounded-full flex items-center justify-around p-2 shadow-xl shadow-black/40" style={{ WebkitBackdropFilter: 'blur(20px)' }}>
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.label}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-300 w-16 active:scale-95",
                                isActive ? "text-brand-pink" : "text-gray-500 "
                            )}
                            onClick={() => {
                                // Simple haptic feedback if available
                                if (typeof navigator !== 'undefined' && navigator.vibrate) {
                                    navigator.vibrate(10);
                                }
                            }}
                        >
                            <div className={cn(
                                "p-1 rounded-lg transition-all",
                                isActive && "bg-brand-pink/10"
                            )}>
                                <Icon className={cn("w-6 h-6", isActive && "fill-current")} />
                            </div>
                            <span className="text-[10px] font-medium">{item.label}</span>
                        </Link>
                    );
                })}

                {/* Wallet Action (If not logged in, or secondary quick access) */}
                <button
                    onClick={() => {
                        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
                        openPurchaseModal();
                    }}
                    className="flex flex-col items-center gap-1 p-2 rounded-xl w-16 text-brand-purple transition-all duration-300 active:scale-95"
                >
                    <div className="p-1 rounded-lg bg-brand-purple/10">
                        <Wallet className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-medium">Wallet</span>
                </button>
            </nav>
        </div>
    );
}
