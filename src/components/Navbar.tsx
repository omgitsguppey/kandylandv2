"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { LogIn, LogOut, Wallet, Plus, Menu } from "lucide-react";
import { ProfileDropdown } from "@/components/Navigation/ProfileDropdown";
import { ProfileSidebar } from "@/components/Navigation/ProfileSidebar";
import { useState } from "react";

import { usePathname } from "next/navigation";

import { AuthModal } from "@/components/Auth/AuthModal";

export function Navbar() {
    const { user, userProfile } = useAuth(); // Removed direct signInWithGoogle
    const { openPurchaseModal } = useUI();
    const pathname = usePathname();

    // UI States
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

    // Don't render Navbar on dashboard pages
    if (pathname?.startsWith("/dashboard")) return null;

    return (
        <>
            <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
                <div className="max-w-7xl mx-auto glass-panel backdrop-blur-3xl bg-white/10 rounded-full px-6 py-3 flex items-center justify-between">
                    <Link href="/" className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-pink to-brand-cyan">
                        KandyDrops
                    </Link>

                    <div className="flex items-center gap-4">
                        {user ? (
                            <>
                                {/* Wallet - Hidden on Mobile, shown on Desktop */}
                                <div className="hidden md:flex items-center gap-3 pl-4 pr-1.5 py-1.5 glass-button rounded-full border border-white/5">
                                    <div className="flex items-center gap-2">
                                        <Wallet className="w-4 h-4 text-brand-yellow drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" />
                                        <span className="font-mono text-brand-yellow font-bold tracking-wider">
                                            {userProfile?.gumDropsBalance || 0}
                                        </span>
                                    </div>
                                    <button
                                        onClick={openPurchaseModal}
                                        className="w-7 h-7 flex items-center justify-center bg-gradient-to-br from-brand-pink to-pink-600 rounded-full text-white shadow-lg shadow-brand-pink/20 hover:scale-105 active:scale-95 transition-all"
                                        title="Buy Gum Drops"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Desktop Profile Dropdown */}
                                <div className="hidden md:block">
                                    <ProfileDropdown />
                                </div>

                                {/* Mobile Menu Trigger */}
                                <button
                                    onClick={() => setIsMobileMenuOpen(true)}
                                    className="md:hidden w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white border border-white/10"
                                >
                                    {user.photoURL ? (
                                        <img src={user.photoURL} alt="Profile" className="w-full h-full rounded-full object-cover opacity-80" />
                                    ) : (
                                        <span className="font-bold text-sm bg-gradient-to-tr from-brand-pink to-brand-purple bg-clip-text text-transparent">
                                            {user.displayName?.charAt(0).toUpperCase()}
                                        </span>
                                    )}
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => setIsAuthModalOpen(true)}
                                className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-white text-black font-bold text-sm tracking-wide shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_25px_rgba(255,255,255,0.5)] hover:scale-105 transition-all duration-300"
                            >
                                <LogIn className="w-4 h-4" />
                                Sign In
                            </button>
                        )}
                    </div>
                </div>
            </nav>

            {/* Mobile Sidebar */}
            <ProfileSidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

            {/* Auth Modal */}
            <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
        </>
    );
}

