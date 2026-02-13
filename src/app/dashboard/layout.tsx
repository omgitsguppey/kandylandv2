"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { LayoutDashboard, Library, Settings, LogOut, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, loading, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

    useEffect(() => {
        if (!loading && !user) {
            router.push("/");
        }
    }, [user, loading, router]);

    if (loading || !user) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-brand-pink border-t-transparent animate-spin" />
            </div>
        );
    }

    const navItems = [
        { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
        { href: "/dashboard/library", label: "My KandyDrops", icon: Library },
        { href: "/dashboard/profile", label: "Settings", icon: Settings },
    ];

    return (
        <div className="min-h-screen bg-black text-white flex">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex w-64 flex-col border-r border-white/10 bg-black/50 backdrop-blur-xl fixed inset-y-0 z-40">
                <div className="p-6">
                    <Link href="/" className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-pink to-brand-cyan">
                        KandyDrops
                    </Link>
                </div>

                <nav className="flex-1 px-4 space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all group",
                                    isActive
                                        ? "bg-brand-pink/10 text-brand-pink"
                                        : "text-gray-400 hover:text-white hover:bg-white/5"
                                )}
                            >
                                <item.icon className={cn("w-5 h-5", isActive ? "text-brand-pink" : "text-gray-500 group-hover:text-gray-300")} />
                                <span className="font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-6 border-t border-white/10">
                    <button
                        onClick={() => logout()}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors w-full"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="font-medium">Sign Out</span>
                    </button>
                    <div className="mt-4 flex items-center gap-3 px-4">
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-xs">
                            {user.displayName?.charAt(0) || "U"}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-bold truncate">{user.displayName}</p>
                            <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-black/80 backdrop-blur-lg border-b border-white/10 z-40 flex items-center justify-between px-4">
                <Link href="/" className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-pink to-brand-cyan">
                    KandyDrops
                </Link>
                <button
                    onClick={() => setIsMobileNavOpen(true)}
                    className="p-2 text-gray-400 hover:text-white"
                >
                    <Menu className="w-6 h-6" />
                </button>
            </div>

            {/* Mobile Sidebar (Sheet) */}
            <AnimatePresence>
                {isMobileNavOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMobileNavOpen(false)}
                            className="fixed inset-0 bg-black/80 z-50 lg:hidden"
                        />
                        <motion.div
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="fixed inset-y-0 right-0 w-3/4 max-w-xs bg-zinc-900 border-l border-white/10 z-50 lg:hidden flex flex-col shadow-2xl"
                        >
                            <div className="flex items-center justify-end p-4 border-b border-white/10">
                                <button onClick={() => setIsMobileNavOpen(false)} className="p-2 text-gray-400 hover:text-white">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <nav className="flex-1 p-4 space-y-2">
                                {navItems.map((item) => {
                                    const isActive = pathname === item.href;
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => setIsMobileNavOpen(false)}
                                            className={cn(
                                                "flex items-center gap-4 px-4 py-4 rounded-xl transition-all",
                                                isActive
                                                    ? "bg-brand-pink/10 text-brand-pink"
                                                    : "text-gray-400 hover:text-white hover:bg-white/5"
                                            )}
                                        >
                                            <item.icon className={cn("w-5 h-5", isActive ? "text-brand-pink" : "text-gray-500")} />
                                            <span className="font-medium text-lg">{item.label}</span>
                                        </Link>
                                    );
                                })}
                            </nav>
                            <div className="p-4 border-t border-white/10">
                                <button
                                    onClick={() => logout()}
                                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors w-full"
                                >
                                    <LogOut className="w-5 h-5" />
                                    <span className="font-medium">Sign Out</span>
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <main className="flex-1 lg:ml-64 pt-16 lg:pt-0 min-h-screen">
                <div className="max-w-7xl mx-auto p-4 md:p-8 animate-in fade-in duration-500">
                    {children}
                </div>
            </main>
        </div>
    );
}
