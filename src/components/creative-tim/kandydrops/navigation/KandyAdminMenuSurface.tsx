"use client";

import Link from "next/link";
import { ChevronDown, LogOut, ShieldCheck, type LucideIcon } from "lucide-react";
import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from "react";

import { cn } from "@/lib/utils";
import { KandyBrandLockup } from "@/components/creative-tim/kandydrops/navigation/KandyNavigationPrimitives";

export type KandyAdminMenuItem = {
    label: string;
    href: string;
    icon: LucideIcon;
};

type KandyAdminMenuSurfaceProps = {
    containerRef: RefObject<HTMLDivElement | null>;
    triggerRef: RefObject<HTMLButtonElement | null>;
    menuRef: RefObject<HTMLDivElement | null>;
    menuId: string;
    isOpen: boolean;
    pathname: string | null;
    navigationItems: KandyAdminMenuItem[];
    onToggle: () => void;
    onMenuKeyDown: (event: ReactKeyboardEvent<HTMLDivElement>) => void;
    onNavigate: (destination: string) => void;
    onLogout: () => void;
};

function isActiveRoute(href: string, pathname: string | null) {
    if (href === "/admin") {
        return pathname === href;
    }

    return pathname === href || pathname?.startsWith(`${href}/`);
}

export function KandyAdminMenuSurface({
    containerRef,
    triggerRef,
    menuRef,
    menuId,
    isOpen,
    pathname,
    navigationItems,
    onToggle,
    onMenuKeyDown,
    onNavigate,
    onLogout,
}: KandyAdminMenuSurfaceProps) {
    const homeItem = navigationItems.find((item) => item.href === "/");
    const operationalItems = navigationItems.filter((item) => item.href !== "/");

    return (
        <div ref={containerRef} className="relative" data-kandy-navigation-surface="admin-menu">
            <button
                ref={triggerRef}
                type="button"
                aria-label="Open admin workspace"
                title="Admin workspace"
                aria-expanded={isOpen}
                aria-haspopup="menu"
                aria-controls={isOpen ? menuId : undefined}
                onClick={onToggle}
                className={cn(
                    "relative flex min-h-11 items-center gap-2 overflow-hidden rounded-2xl border px-3 text-xs font-black uppercase tracking-[0.12em] shadow-lg shadow-black/20 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kandy-lilac focus-visible:ring-offset-2 focus-visible:ring-offset-kandy-void",
                    isOpen
                        ? "border-kandy-lilac/65 bg-gradient-to-r from-brand-purple/40 to-brand-pink/25 text-white"
                        : "border-brand-purple/35 bg-brand-purple/12 text-kandy-lilac hover:border-kandy-lilac/65 hover:bg-brand-purple/20",
                )}
            >
                <span aria-hidden="true" className="absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/55 to-transparent" />
                <ShieldCheck aria-hidden="true" className="relative h-4 w-4" />
                <span className="relative hidden sm:inline">Control tower</span>
                <ChevronDown aria-hidden="true" className={cn("relative h-3.5 w-3.5 transition-transform duration-200", isOpen && "rotate-180")} />
            </button>

            {isOpen ? (
                <div
                    ref={menuRef}
                    id={menuId}
                    role="menu"
                    aria-label="Admin workspace menu"
                    onKeyDown={onMenuKeyDown}
                    className="absolute right-0 top-full z-50 mt-3 w-[calc(100vw-1.5rem)] max-w-[31rem] overflow-hidden rounded-[2rem] border border-kandy-lilac/30 bg-kandy-void/95 p-3 shadow-[0_28px_80px_rgba(0,0,0,0.6)] backdrop-blur-3xl sm:p-4"
                >
                    <span aria-hidden="true" className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
                    <span aria-hidden="true" className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-brand-purple/25 blur-3xl" />
                    <span aria-hidden="true" className="absolute -left-20 bottom-0 h-40 w-40 rounded-full bg-brand-pink/15 blur-3xl" />

                    <div className="relative space-y-3">
                        <header className="flex items-center justify-between gap-4 rounded-[1.45rem] border border-white/12 bg-black/20 p-3">
                            <span className="min-w-0"><KandyBrandLockup /></span>
                            <span className="shrink-0 rounded-full border border-kandy-lilac/35 bg-kandy-lilac/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-kandy-lilac">Admin</span>
                        </header>

                        {homeItem ? (
                            <Link
                                href={homeItem.href}
                                role="menuitem"
                                onClick={() => onNavigate(homeItem.href)}
                                className="flex min-h-11 items-center justify-between rounded-2xl border border-white/10 bg-white/[0.045] px-3 text-sm font-bold text-gray-200 transition-colors hover:border-kandy-lilac/45 hover:bg-white/[0.085] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kandy-lilac"
                            >
                                <span className="flex items-center gap-2"><homeItem.icon aria-hidden="true" className="h-4 w-4 text-kandy-lilac" /> Return to KandyDrops</span>
                                <span aria-hidden="true" className="text-kandy-lilac">↗</span>
                            </Link>
                        ) : null}

                        <section aria-label="Admin workspaces">
                            <p className="mb-2 px-1 text-[10px] font-black uppercase tracking-[0.18em] text-kandy-lilac/75">Operational areas</p>
                            <div className="grid grid-cols-2 gap-2">
                                {operationalItems.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = isActiveRoute(item.href, pathname);

                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            role="menuitem"
                                            aria-current={isActive ? "page" : undefined}
                                            onClick={() => onNavigate(item.href)}
                                            className={cn(
                                                "relative flex min-h-[5.75rem] flex-col justify-between overflow-hidden rounded-2xl border p-3 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kandy-lilac",
                                                isActive
                                                    ? "border-kandy-lilac/60 bg-gradient-to-br from-brand-purple/30 via-kandy-void to-brand-pink/15 text-white shadow-lg shadow-brand-purple/15"
                                                    : "border-white/10 bg-white/[0.045] text-gray-200 hover:border-kandy-lilac/45 hover:bg-white/[0.085]",
                                            )}
                                        >
                                            <span aria-hidden="true" className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-brand-purple/0 blur-2xl transition-colors hover:bg-brand-purple/20" />
                                            <Icon aria-hidden="true" className={cn("relative h-4 w-4", isActive ? "text-kandy-lilac" : "text-gray-400")} />
                                            <span className="relative text-xs font-bold leading-tight">{item.label}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </section>

                        <button
                            type="button"
                            role="menuitem"
                            onClick={onLogout}
                            className="flex min-h-11 w-full items-center justify-between rounded-2xl border border-red-400/20 bg-red-500/[0.06] px-3 text-left text-xs font-bold text-red-200 transition-colors hover:bg-red-500/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                        >
                            <span className="flex items-center gap-2"><LogOut aria-hidden="true" className="h-4 w-4" /> End admin session</span>
                            <span className="text-[10px] font-medium text-red-200/70">Sign out</span>
                        </button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
