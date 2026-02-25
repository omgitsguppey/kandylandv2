"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuthIdentity, useAuth } from "@/context/AuthContext";
import { LayoutDashboard, Package, PlusCircle, Users, Terminal, LogOut, ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";

export function AdminDropdown() {
    const { user } = useAuthIdentity();
    const { logout } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Strict Admin Check
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

    if (!isAdmin) return null;

    const navItems = [
        { label: "Overview", href: "/admin", icon: LayoutDashboard },
        { label: "Drops", href: "/admin/drops", icon: Package },
        { label: "Create Drop", href: "/admin/create", icon: PlusCircle },
        { label: "Users", href: "/admin/users", icon: Users },
        { label: "Debug Console", href: "/admin/debug", icon: Terminal },
    ];

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full transition-all border",
                    isOpen
                        ? "bg-brand-cyan/20 text-brand-cyan border-brand-cyan/30 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                        : "bg-white/5 text-gray-400 border-white/5  "
                )}
            >
                <ShieldCheck className="w-4 h-4" />
                <span className="text-xs font-bold hidden md:inline-block">Admin</span>
            </button>

            {/* Dropdown Menu */}
            <div
                className={cn(
                    "absolute right-0 top-full mt-2 w-56 bg-zinc-950 border border-white/10 rounded-2xl p-2 shadow-2xl backdrop-blur-3xl overflow-hidden origin-top-right transition-all duration-200 z-50",
                    isOpen
                        ? "opacity-100 scale-100 translate-y-0"

                        : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
                )}
            >
                <div className="px-4 py-2 border-b border-white/10 mb-2">
                    <p className="text-xs font-bold text-brand-cyan uppercase tracking-wider">Admin Console</p>
                </div>

                <nav className="space-y-1">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-3 px-3 py-2 text-sm text-gray-300 rounded-xl transition-all group"
                        >
                            <item.icon className="w-4 h-4 text-gray-400 transition-colors" />
                            {item.label}
                        </Link>
                    ))}
                </nav>

                <div className="mt-2 pt-2 border-t border-white/10">
                    <button
                        onClick={() => {
                            logout();
                            setIsOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 rounded-xl transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
    );
}
