"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { User, LogOut, LayoutDashboard, Library, Settings, ChevronDown } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

export function ProfileDropdown() {
    const { user, logout } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const isAdmin = user?.email === "uylusjohnson@gmail.com";

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (!user) return null;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 pl-2 pr-4 py-1.5 rounded-full hover:bg-white/10 transition-colors border border-transparent hover:border-white/10"
            >
                <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-pink to-brand-purple flex items-center justify-center text-white font-bold text-sm shadow-md">
                        {user.displayName?.charAt(0).toUpperCase() || "U"}
                    </div>
                    {isAdmin && (
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-brand-cyan rounded-full border-2 border-black" title="Admin User" />
                    )}
                </div>
                <div className="hidden md:flex flex-col items-start text-xs">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-white leading-tight">{user.displayName}</span>
                        {isAdmin && (
                            <span className="px-1.5 py-0.5 rounded-full bg-brand-cyan/20 text-brand-cyan text-[10px] font-bold border border-brand-cyan/30">
                                ADMIN
                            </span>
                        )}
                    </div>
                    <span className="text-gray-400 font-medium">View Profile</span>
                </div>
                <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform duration-300", isOpen && "rotate-180")} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 top-full mt-2 w-64 glass-panel backdrop-blur-3xl bg-black/80 rounded-2xl p-2 shadow-2xl border border-white/10 overflow-hidden origin-top-right z-50"
                    >
                        <div className="px-4 py-3 border-b border-white/10 mb-2">
                            <p className="text-sm font-bold text-white flex items-center gap-2">
                                My Account
                                {isAdmin && <span className="text-xs text-brand-cyan">(Admin)</span>}
                            </p>
                            <p className="text-xs text-gray-400 truncate">{user.email}</p>
                        </div>

                        <nav className="space-y-1">
                            {isAdmin && (
                                <DropdownItem href="/admin" icon={<LayoutDashboard className="w-4 h-4 text-brand-cyan" />} label="Admin Dashboard" onClick={() => setIsOpen(false)} />
                            )}
                            <DropdownItem href="/dashboard" icon={<LayoutDashboard className="w-4 h-4" />} label="Dashboard" onClick={() => setIsOpen(false)} />
                            <DropdownItem href="/dashboard/library" icon={<Library className="w-4 h-4" />} label="My KandyDrops" onClick={() => setIsOpen(false)} />
                            <DropdownItem href="/dashboard/profile" icon={<Settings className="w-4 h-4" />} label="Settings" onClick={() => setIsOpen(false)} />
                        </nav>

                        <div className="mt-2 pt-2 border-t border-white/10">
                            <button
                                onClick={() => {
                                    logout();
                                    setIsOpen(false);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                Sign Out
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function DropdownItem({ href, icon, label, onClick }: { href: string; icon: React.ReactNode; label: string; onClick: () => void }) {
    return (
        <Link
            href={href}
            onClick={onClick}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-xl transition-all group"
        >
            <span className="group-hover:text-brand-pink transition-colors">{icon}</span>
            {label}
        </Link>
    );
}
