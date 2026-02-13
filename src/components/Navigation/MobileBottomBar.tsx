"use client";

import { Home, Grid, Wallet, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";

export default function MobileBottomBar() {
    const pathname = usePathname();
    const { user, userProfile } = useAuth();
    const { openPurchaseModal } = useUI();

    // Hide on desktop (md and up) and on admin pages
    if (pathname?.startsWith("/admin")) return null;

    const navItems = [
        { label: "Home", href: "/", icon: Home },
        { label: "Drops", href: "/drops", icon: Grid },
        { label: "Experiences", href: "/experiences", icon: Sparkles },
    ];

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 p-4 pb-6 pointer-events-none">
            {/* Floating Balance Badge (Dynamic Island style) - Only if logged in */}
            {user && (
                <div className="absolute bottom-28 left-1/2 -translate-x-1/2 pointer-events-auto">
                    <button
                        onClick={openPurchaseModal}
                        className="bg-black/80 backdrop-blur-xl border border-brand-yellow/30 pl-3 pr-4 py-1.5 rounded-full flex items-center gap-2 shadow-[0_4px_20px_rgba(250,204,21,0.2)] animate-in slide-in-from-bottom-4 duration-500"
                    >
                        <div className="w-5 h-5 bg-brand-yellow/20 rounded-full flex items-center justify-center">
                            <Wallet className="w-3 h-3 text-brand-yellow" />
                        </div>
                        <span className="font-bold text-sm text-white tabular-nums">
                            {userProfile?.gumDropsBalance || 0}
                        </span>
                        <div className="flex flex-col leading-none">
                            <span className="text-[8px] text-gray-400 font-bold uppercase tracking-wider">Add</span>
                        </div>
                    </button>
                </div>
            )}

            <nav className="pointer-events-auto bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center justify-around p-2 shadow-2xl shadow-black/50">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.label}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-300 w-16 active:scale-90",
                                isActive ? "text-brand-pink" : "text-gray-500 hover:text-white"
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
                    className="flex flex-col items-center gap-1 p-2 rounded-xl w-16 text-brand-yellow hover:text-white transition-colors active:scale-90"
                >
                    <div className="p-1 rounded-lg bg-brand-yellow/10">
                        <Wallet className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-medium">Wallet</span>
                </button>
            </nav>
        </div>
    );
}
