"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronDown, LogOut, type LucideIcon } from "lucide-react";
import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from "react";

import { cn } from "@/lib/utils";

export type KandyProfileMenuItem = {
    href: string;
    icon: LucideIcon;
    label: string;
    hasUnreadIndicator?: boolean;
};

export type KandyProfileMenuSection = {
    label: string;
    layout: "primary" | "feature" | "utility";
    items: KandyProfileMenuItem[];
};

type KandyProfileMenuSurfaceProps = {
    containerRef: RefObject<HTMLDivElement | null>;
    triggerRef: RefObject<HTMLButtonElement | null>;
    menuRef: RefObject<HTMLDivElement | null>;
    menuId: string;
    isOpen: boolean;
    displayName: string;
    primaryIdentity: string;
    secondaryIdentity: string;
    avatarUrl: string | null;
    isAdmin: boolean;
    navigationSections: KandyProfileMenuSection[];
    accountHref: string;
    onToggle: () => void;
    onMenuKeyDown: (event: ReactKeyboardEvent<HTMLDivElement>) => void;
    onNavigate: (destination: string) => void;
    onLogout: () => void;
};

export function KandyProfileMenuSurface({
    containerRef,
    triggerRef,
    menuRef,
    menuId,
    isOpen,
    displayName,
    primaryIdentity,
    secondaryIdentity,
    avatarUrl,
    isAdmin,
    navigationSections,
    accountHref,
    onToggle,
    onMenuKeyDown,
    onNavigate,
    onLogout,
}: KandyProfileMenuSurfaceProps) {
    return (
        <div ref={containerRef} className="relative" data-kandy-navigation-surface="account-menu">
            <button
                ref={triggerRef}
                type="button"
                aria-label={`${isOpen ? "Close" : "Open"} account menu for ${primaryIdentity}`}
                title="Kandy account"
                aria-expanded={isOpen}
                aria-haspopup="menu"
                aria-controls={isOpen ? menuId : undefined}
                onClick={onToggle}
                className={cn(
                    "group relative flex min-h-11 items-center gap-2 overflow-hidden rounded-2xl border px-2 py-1.5 text-left shadow-lg shadow-black/15 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kandy-lilac focus-visible:ring-offset-2 focus-visible:ring-offset-kandy-void",
                    isOpen
                        ? "border-kandy-lilac/60 bg-gradient-to-r from-brand-purple/35 via-kandy-void to-brand-pink/20 text-white"
                        : "border-white/10 bg-white/[0.045] text-gray-200 hover:border-kandy-lilac/45 hover:bg-white/[0.085]",
                )}
            >
                <span aria-hidden="true" className="absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/55 to-transparent" />
                <span className="relative grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/20 bg-gradient-to-br from-brand-purple via-kandy-lilac to-brand-pink text-sm font-black text-white shadow-inner shadow-white/20">
                    {avatarUrl ? (
                        <Image src={avatarUrl} alt="" fill sizes="32px" className="object-cover" />
                    ) : (
                        displayName.charAt(0)?.toUpperCase() || "U"
                    )}
                </span>
                <span className="hidden min-w-0 flex-1 flex-col pr-1 sm:flex">
                    <span className="truncate text-xs font-black leading-tight text-white">{primaryIdentity}</span>
                    <span className="truncate text-[10px] font-medium text-kandy-lilac/85">Account</span>
                </span>
                <ChevronDown aria-hidden="true" className={cn("h-4 w-4 shrink-0 text-kandy-lilac transition-transform duration-200", isOpen && "rotate-180")} />
            </button>

            {isOpen ? (
                <div
                    ref={menuRef}
                    id={menuId}
                    role="menu"
                    aria-label="Kandy account menu"
                    onKeyDown={onMenuKeyDown}
                    className="absolute right-0 top-full z-50 mt-3 w-[calc(100vw-1.5rem)] max-w-[30rem] overflow-hidden rounded-[2rem] border border-kandy-lilac/30 bg-kandy-void/95 p-3 shadow-[0_28px_80px_rgba(0,0,0,0.58)] backdrop-blur-3xl sm:p-4"
                >
                    <span aria-hidden="true" className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
                    <span aria-hidden="true" className="absolute -left-16 -top-16 h-40 w-40 rounded-full bg-brand-purple/25 blur-3xl" />
                    <span aria-hidden="true" className="absolute -right-16 top-24 h-36 w-36 rounded-full bg-brand-pink/15 blur-3xl" />

                    <div className="relative space-y-3">
                        <header className="flex items-center gap-3 rounded-[1.45rem] border border-white/12 bg-black/20 p-3">
                            <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/25 bg-gradient-to-br from-brand-purple via-kandy-lilac to-brand-pink text-base font-black text-white shadow-lg shadow-brand-purple/25">
                                {avatarUrl ? (
                                    <Image src={avatarUrl} alt={displayName} width={48} height={48} className="h-12 w-12 object-cover" />
                                ) : (
                                    displayName.charAt(0)?.toUpperCase() || "U"
                                )}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="flex flex-wrap items-center gap-2">
                                    <span className="truncate text-sm font-black text-white">{primaryIdentity}</span>
                                    {isAdmin ? <span className="rounded-full border border-kandy-lilac/45 bg-kandy-lilac/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-kandy-lilac">Admin</span> : null}
                                </span>
                                <span className="mt-0.5 block truncate text-xs text-gray-400">{secondaryIdentity}</span>
                            </span>
                            <Link
                                href={accountHref}
                                role="menuitem"
                                aria-label="Open account settings"
                                onClick={() => onNavigate(accountHref)}
                                className="inline-flex min-h-11 shrink-0 items-center rounded-xl border border-kandy-lilac/25 bg-kandy-lilac/10 px-3 text-xs font-bold text-kandy-lilac transition-colors hover:bg-kandy-lilac/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kandy-lilac"
                            >
                                Account
                            </Link>
                        </header>

                        {navigationSections.map((section) => (
                            <section key={section.label} aria-label={section.label}>
                                <p className="mb-2 px-1 text-[10px] font-black uppercase tracking-[0.18em] text-kandy-lilac/75">{section.label}</p>
                                <div className={cn(
                                    "grid gap-2",
                                    section.layout === "primary" ? "grid-cols-3" : "grid-cols-2",
                                )}>
                                    {section.items.map((item) => {
                                        const Icon = item.icon;

                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                role="menuitem"
                                                onClick={() => onNavigate(item.href)}
                                                className={cn(
                                                    "group relative flex min-h-[5.75rem] flex-col justify-between overflow-hidden rounded-2xl border p-3 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kandy-lilac",
                                                    section.layout === "feature"
                                                        ? "border-brand-purple/30 bg-gradient-to-br from-brand-purple/20 via-white/[0.045] to-brand-pink/10 hover:border-kandy-lilac/60 hover:shadow-lg hover:shadow-brand-purple/15"
                                                        : "border-white/10 bg-white/[0.045] hover:border-kandy-lilac/45 hover:bg-white/[0.085]",
                                                )}
                                            >
                                                <span aria-hidden="true" className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-brand-purple/0 blur-2xl transition-colors group-hover:bg-brand-purple/20" />
                                                <span className="relative flex h-8 w-8 items-center justify-center rounded-xl border border-white/15 bg-black/20 text-kandy-lilac">
                                                    <Icon aria-hidden="true" className="h-4 w-4" />
                                                    {item.hasUnreadIndicator ? <><span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-kandy-void bg-brand-pink" /><span className="sr-only">Unread messages</span></> : null}
                                                </span>
                                                <span className="relative text-left text-xs font-bold leading-tight text-white">{item.label}</span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </section>
                        ))}

                        <button
                            type="button"
                            role="menuitem"
                            onClick={onLogout}
                            className="flex min-h-11 w-full items-center justify-between rounded-2xl border border-red-400/20 bg-red-500/[0.06] px-3 text-left text-xs font-bold text-red-200 transition-colors hover:bg-red-500/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                        >
                            <span className="flex items-center gap-2"><LogOut aria-hidden="true" className="h-4 w-4" /> End session</span>
                            <span className="text-[10px] font-medium text-red-200/70">Sign out</span>
                        </button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
