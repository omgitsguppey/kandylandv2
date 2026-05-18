"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { LogOut, LayoutDashboard, Library, Settings, ChevronDown, CircleHelp, LifeBuoy, FileText, MessageSquare, Sparkles } from "lucide-react";

import { useAuth, useUserProfile } from "@/context/AuthContext";
import { useChatUnreadStatus } from "@/hooks/useChatUnreadStatus";
import { CREATOR_DASHBOARD_ROUTE, CREATOR_SETTINGS_ROUTE } from "@/lib/creator-profile-routing";
import { trackEvent } from "@/lib/telemetry";
import { cn } from "@/lib/utils";

export function ProfileDropdown() {
    const { user, logout } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const { userProfile } = useUserProfile();
    const { hasUnreadMessages } = useChatUnreadStatus();
    const isAdmin = userProfile?.role === "admin";
    const isCreatorAccount = userProfile?.role === "creator" || isAdmin;

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

    const displayName = typeof user.displayName === "string" && user.displayName.trim().length > 0 ? user.displayName : "User";
    const username = typeof userProfile?.username === "string" && userProfile.username.trim().length > 0 ? userProfile.username.trim() : "";
    const primaryIdentity = username ? `@${username}` : displayName;
    const secondaryIdentity = username && displayName !== username
        ? displayName
        : typeof user.email === "string" && user.email.trim().length > 0
            ? user.email
            : "Manage account";
    const avatarUrl = typeof user.photoURL === "string" && user.photoURL.trim().length > 0 ? user.photoURL : null;
    return (
        <div className="relative" ref={dropdownRef}>
            <button
                aria-label="Open profile menu"
                title="Profile menu"
                aria-expanded={isOpen}
                aria-haspopup="menu"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 pl-2 pr-4 py-1.5 rounded-full transition-colors border border-transparent"
            >
                <div className="relative">
                    <div className="relative w-8 h-8 overflow-hidden rounded-full bg-gradient-to-tr from-brand-purple to-brand-purple flex items-center justify-center text-white font-bold text-sm shadow-md">
                        {avatarUrl ? (
                            <Image src={avatarUrl} alt={displayName} fill sizes="32px" className="object-cover" />
                        ) : (
                            <span>{displayName.charAt(0)?.toUpperCase() || "U"}</span>
                        )}
                    </div>
                    {isAdmin && (
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-brand-purple rounded-full border-2 border-black" title="Admin User" />
                    )}
                </div>
                <div className="hidden md:flex flex-col items-start text-xs">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-white leading-tight">{primaryIdentity}</span>
                        {isAdmin && (
                            <span className="px-1.5 py-0.5 rounded-full bg-brand-purple/20 text-brand-purple text-[10px] font-bold border border-brand-purple/30">
                                ADMIN
                            </span>
                        )}
                    </div>
                    <span className="text-gray-400 font-medium truncate max-w-[12rem]">{secondaryIdentity}</span>
                </div>
                <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform duration-300", isOpen && "rotate-180")} />
            </button>

            {isOpen && (
                <div
                    className="absolute right-0 top-full mt-2 w-64 bg-zinc-950 border border-white/10 rounded-2xl p-2 shadow-2xl backdrop-blur-3xl overflow-hidden origin-top-right z-50"
                >

                    <div className="px-4 py-3 border-b border-white/10 mb-2 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-white flex items-center gap-2 truncate">
                                {primaryIdentity}
                                {isAdmin && <span className="text-xs text-brand-purple">(Admin)</span>}
                            </p>
                            <p className="text-xs text-gray-400 truncate">{secondaryIdentity}</p>
                        </div>
                        <Link href="/settings" onClick={() => setIsOpen(false)} className="p-2 rounded-full bg-white/5 border border-white/10" title="Account Settings" aria-label="Open account settings">
                            <Settings className="w-4 h-4 text-gray-300" />
                        </Link>
                    </div>

                    <nav className="space-y-1">
                        <DropdownItem href="/dashboard" icon={<LayoutDashboard className="w-4 h-4" />} label="Dashboard" onClick={() => setIsOpen(false)} />
                        <DropdownItem href="/dashboard/chat" icon={
                            <div className="relative">
                                <MessageSquare className="w-4 h-4" />
                                {hasUnreadMessages && (
                                    <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-brand-purple ring-2 ring-zinc-950" />
                                )}
                            </div>
                        } label="Chat" onClick={() => setIsOpen(false)} />
                        <DropdownItem href="/dashboard/library" icon={<Library className="w-4 h-4" />} label="My KandyDrops" onClick={() => setIsOpen(false)} />
                        {isCreatorAccount ? (
                            <>
                                <DropdownItem href={CREATOR_DASHBOARD_ROUTE} icon={<Sparkles className="w-4 h-4" />} label="Creator Dashboard" onClick={() => setIsOpen(false)} />
                                <DropdownItem href={CREATOR_SETTINGS_ROUTE} icon={<Settings className="w-4 h-4" />} label="Creator Settings" onClick={() => setIsOpen(false)} />
                            </>
                        ) : null}
                        <DropdownItem href="/settings" icon={<Settings className="w-4 h-4" />} label="Account Settings" onClick={() => setIsOpen(false)} />
                    </nav>

                    <div className="mt-2 pt-2 border-t border-white/10">
                        <p className="px-4 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">Help & policies</p>
                        <nav className="space-y-1">
                            <DropdownItem href="/faq" icon={<CircleHelp className="w-4 h-4" />} label="FAQ" onClick={() => setIsOpen(false)} />
                            <DropdownItem href="/dashboard/support" icon={<LifeBuoy className="w-4 h-4" />} label="Support" onClick={() => setIsOpen(false)} />
                            <DropdownItem href="/privacy" icon={<FileText className="w-4 h-4" />} label="Policies" onClick={() => setIsOpen(false)} />
                        </nav>
                    </div>

                    <div className="mt-2 pt-2 border-t border-white/10">
                        <button
                            onClick={() => {
                                logout();
                                setIsOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-400 rounded-xl transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function DropdownItem({ href, icon, label, onClick }: { href: string; icon: React.ReactNode; label: string; onClick: () => void }) {
    const handleClick = () => {
        trackEvent("navigation_click", { destination: href, source: "profile_dropdown" });
        onClick();
    };

    const className = "flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 rounded-xl transition-all group";

    return (
        <Link
            href={href}
            onClick={handleClick}
            className={className}
        >
            <span className="transition-colors">{icon}</span>
            {label}
        </Link>
    );
}
