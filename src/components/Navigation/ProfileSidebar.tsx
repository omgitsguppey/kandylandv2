"use client";

import { useEffect } from "react";
import Link from "next/link";
import { CandyOutlineIcon as LogOut, CandyOutlineIcon as LayoutDashboard, CandyOutlineIcon as Library, CandyOutlineIcon as Settings, CandyOutlineIcon as X, CandyOutlineIcon as Plus } from "@/components/ui/Icon";

import { useAuthIdentity, useUserProfile } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { cn } from "@/lib/utils";

interface ProfileSidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ProfileSidebar({ isOpen, onClose }: ProfileSidebarProps) {
    const { user, logout } = useAuthIdentity();
    const { userProfile } = useUserProfile();
    const { openPurchaseModal } = useUI();

    const isAdmin = user?.email === "uylusjohnson@gmail.com";

    // Prevent body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => { document.body.style.overflow = "unset"; };
    }, [isOpen]);

    if (!user) return null;

    return (
        isOpen ? (
            <>
                {/* Backdrop */}
                <div
                    onClick={onClose}
                    className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
                />

                {/* Sidebar */}
                <div
                    className="fixed top-0 right-0 bottom-0 w-[85vw] max-w-sm z-[70] bg-zinc-900 border-l border-white/10 flex flex-col shadow-2xl"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-pink to-brand-purple flex items-center justify-center text-white font-bold shadow-lg">
                                    {user.displayName?.charAt(0).toUpperCase() || "U"}
                                </div>
                                {isAdmin && (
                                    <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-brand-cyan rounded-full border-2 border-black" />
                                )}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-white mb-0.5">{user.displayName}</h3>
                                    {isAdmin && (
                                        <span className="px-1.5 py-0.5 rounded-full bg-brand-cyan/20 text-brand-cyan text-[10px] font-bold border border-brand-cyan/30">
                                            ADMIN
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-gray-400">{user.email}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-full transition-colors text-gray-400">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Wallet Section */}
                    <div className="p-6">
                        <div className="glass-panel bg-white/5 rounded-2xl p-4 flex items-center justify-between mb-2">
                            <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">My Stash</p>
                                <p className="text-2xl font-bold text-brand-purple">{userProfile?.gumDropsBalance || 0} <span className="text-sm text-gray-400 font-normal">Drops</span></p>
                            </div>
                            <button
                                onClick={() => {
                                    onClose();
                                    openPurchaseModal();
                                }}
                                className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-pink to-purple-600 flex items-center justify-center text-white shadow-lg shadow-brand-pink/20 active:scale-95 transition-transform"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-4 space-y-1">
                        <SidebarItem href="/dashboard" icon={<LayoutDashboard className="w-5 h-5" />} label="Dashboard" onClick={onClose} />
                        <SidebarItem href="/dashboard/library" icon={<Library className="w-5 h-5" />} label="My KandyDrops" onClick={onClose} />
                        <SidebarItem href="/dashboard/profile" icon={<Settings className="w-5 h-5" />} label="Settings" onClick={onClose} />
                    </nav>

                    {/* Footer */}
                    <div className="p-6 border-t border-white/10">
                        <button
                            onClick={() => {
                                logout();
                                onClose();
                            }}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-red-500 bg-red-500/10 rounded-xl transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                        </button>
                    </div>
                </div>
            </>
        ) : null
    );
}

function SidebarItem({ href, icon, label, onClick }: { href: string; icon: React.ReactNode; label: string; onClick: () => void }) {
    return (
        <Link
            href={href}
            onClick={onClick}
            className="flex items-center gap-3 px-4 py-3 text-gray-300 rounded-xl transition-all group"
        >
            <span className="transition-colors">{icon}</span>
            <span className="font-medium">{label}</span>
        </Link>
    );
}
