"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { LayoutDashboard, PlusCircle, LogOut, Package, Users, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";

const ADMIN_EMAIL = "uylusjohnson@gmail.com";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, loading: authLoading, logout } = useAuth();
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        if (!authLoading) {
            if (!user || user.email !== ADMIN_EMAIL) {
                router.push("/");
            } else {
                setIsAuthorized(true);
            }
        }
    }, [user, authLoading, router]);

    if (authLoading || !isAuthorized) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-brand-pink border-t-transparent animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-20 flex bg-black">
            {/* Mobile Header Toggle */}
            <div className="md:hidden fixed top-20 left-0 right-0 z-30 bg-black/80 backdrop-blur-md border-b border-white/10 px-4 py-3 flex items-center justify-between">
                <span className="font-bold text-white">Admin Console</span>
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="p-2 rounded-lg bg-white/10 text-white"
                >
                    {isSidebarOpen ? <LogOut className="w-5 h-5" /> : <LayoutDashboard className="w-5 h-5" />}
                </button>
            </div>

            {/* Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="md:hidden fixed inset-0 z-40 bg-black/80 backdrop-blur-sm"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={cn(
                "fixed left-0 top-20 bottom-0 w-64 bg-black/90 border-r border-white/10 backdrop-blur-xl p-6 flex flex-col z-50 transition-transform duration-300 ease-in-out md:translate-x-0",
                isSidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="mb-8">
                    <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Admin Console</h2>
                    <nav className="space-y-2">
                        <Link
                            href="/admin"
                            className="flex items-center gap-3 px-4 py-3 rounded-xl text-white hover:bg-white/5 transition-colors group"
                            onClick={() => setIsSidebarOpen(false)}
                        >
                            <LayoutDashboard className="w-5 h-5 text-gray-400 group-hover:text-brand-cyan transition-colors" />
                            <span className="font-medium">Overview</span>
                        </Link>
                        <Link
                            href="/admin/drops"
                            className="flex items-center gap-3 px-4 py-3 rounded-xl text-white hover:bg-white/5 transition-colors group"
                            onClick={() => setIsSidebarOpen(false)}
                        >
                            <Package className="w-5 h-5 text-gray-400 group-hover:text-brand-pink transition-colors" />
                            <span className="font-medium">Drops</span>
                        </Link>
                        <Link
                            href="/admin/create"
                            className="flex items-center gap-3 px-4 py-3 rounded-xl text-white hover:bg-white/5 transition-colors group"
                            onClick={() => setIsSidebarOpen(false)}
                        >
                            <PlusCircle className="w-5 h-5 text-gray-400 group-hover:text-brand-green transition-colors" />
                            <span className="font-medium">Create Drop</span>
                        </Link>
                        <Link
                            href="/admin/users"
                            className="flex items-center gap-3 px-4 py-3 rounded-xl text-white hover:bg-white/5 transition-colors group"
                            onClick={() => setIsSidebarOpen(false)}
                        >
                            <Users className="w-5 h-5 text-gray-400 group-hover:text-brand-yellow transition-colors" />
                            <span className="font-medium">Users</span>
                        </Link>
                        <div className="pt-4 mt-4 border-t border-white/10">
                            <Link
                                href="/admin/debug"
                                className="flex items-center gap-3 px-4 py-3 rounded-xl text-white hover:bg-white/5 transition-colors group"
                                onClick={() => setIsSidebarOpen(false)}
                            >
                                <Terminal className="w-5 h-5 text-gray-500 group-hover:text-brand-cyan transition-colors" />
                                <span className="font-medium text-gray-400 group-hover:text-white">Debug Console</span>
                            </Link>
                        </div>
                    </nav>
                </div>

                <div className="mt-auto">
                    <button
                        onClick={() => logout()}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors w-full"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="font-medium">Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 md:ml-64 p-4 md:p-8 overflow-y-auto min-h-[calc(100vh-80px)] mt-14 md:mt-0">
                <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
                    {children}
                </div>
            </main>
        </div>
    );
}
