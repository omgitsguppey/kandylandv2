"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { LogOut, LayoutDashboard, Library, Settings, X, Plus } from "lucide-react";

import { useAuthIdentity, useUserProfile } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";

interface ProfileSidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

interface SidebarItemProps {
    href: string;
    icon: ReactNode;
    label: string;
    onClick: () => void;
}

export function ProfileSidebar({ isOpen, onClose }: ProfileSidebarProps) {
    const { user, logout } = useAuthIdentity();
    const { userProfile } = useUserProfile();
    const { openPurchaseModal } = useUI();

    const isAdmin = user?.email === "uylusjohnson@gmail.com";

    useEffect(() => {
        document.body.style.overflow = isOpen ? "hidden" : "unset";
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    if (!user || !isOpen) return null;

    const displayName = typeof user.displayName === "string" && user.displayName.trim().length > 0 ? user.displayName : "User";
    const email = typeof user.email === "string" && user.email.trim().length > 0 ? user.email : "No email";
    const profileInitial = displayName.charAt(0).toUpperCase();
    const gumDropsBalance = typeof userProfile?.gumDropsBalance === "number" && Number.isFinite(userProfile.gumDropsBalance)
        ? userProfile.gumDropsBalance
        : 0;

    return (
        <>
            <div
                onClick={onClose}
                className="fixed inset-0 z-[100] bg-black/50"
                aria-hidden
            />

            <aside className="fixed top-0 right-0 bottom-0 w-[85vw] max-w-sm z-[110] bg-[#0b0b10] border-l border-white/10 rounded-l-2xl shadow-2xl shadow-black/50 overflow-hidden">
                <div className="h-full overflow-y-auto">
                    <div className="sticky top-0 z-20 bg-[#0b0b10]/95 backdrop-blur-md border-b border-white/10 px-4 md:px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-4">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="relative shrink-0">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-pink to-brand-purple flex items-center justify-center text-white font-bold shadow-lg">
                                        {profileInitial}
                                    </div>
                                    {isAdmin ? <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-brand-cyan rounded-full border-2 border-black" /> : null}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-white truncate">{displayName}</h3>
                                        {isAdmin ? (
                                            <span className="px-1.5 py-0.5 rounded-full bg-brand-cyan/20 text-brand-cyan text-[10px] font-bold border border-brand-cyan/30">ADMIN</span>
                                        ) : null}
                                    </div>
                                    <p className="text-xs text-gray-400 truncate">{email}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={() => {
                                        logout();
                                        onClose();
                                    }}
                                    className="h-11 px-3 rounded-xl border border-red-500/30 text-red-300 bg-red-500/10 hover:bg-red-500/15 transition-colors flex items-center gap-1.5"
                                    title="Sign Out"
                                >
                                    <LogOut className="w-4 h-4" />
                                    <span className="text-xs font-semibold">Log out</span>
                                </button>
                                <button
                                    onClick={onClose}
                                    className="w-11 h-11 rounded-xl border border-white/10 text-gray-200 hover:bg-white/5 transition-colors flex items-center justify-center"
                                    title="Close"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="px-4 md:px-5 py-5 space-y-5">
                        <div className="glass-panel bg-white/5 rounded-2xl p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">My Stash</p>
                                <p className="text-2xl font-bold text-brand-purple">{gumDropsBalance} <span className="text-sm text-gray-400 font-normal">Drops</span></p>
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

                        <nav className="space-y-1">
                            <SidebarItem href="/dashboard" icon={<LayoutDashboard className="w-5 h-5" />} label="Dashboard" onClick={onClose} />
                            <SidebarItem href="/dashboard/library" icon={<Library className="w-5 h-5" />} label="My KandyDrops" onClick={onClose} />
                            <SidebarItem href="/dashboard/profile" icon={<Settings className="w-5 h-5" />} label="Settings" onClick={onClose} />
                        </nav>
                    </div>

                    <div className="h-[env(safe-area-inset-bottom)]" />
                </div>
            </aside>
        </>
    );
}

function SidebarItem({ href, icon, label, onClick }: SidebarItemProps) {
    return (
        <Link
            href={href}
            onClick={onClick}
            className="flex items-center gap-3 px-4 py-3 text-gray-300 rounded-xl transition-all group hover:bg-white/5"
        >
            <span className="transition-colors">{icon}</span>
            <span className="font-medium">{label}</span>
        </Link>
    );
}
