"use client";

import Link from "next/link";
import { ChevronDown, LogOut, ShieldCheck, type LucideIcon } from "lucide-react";
import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from "react";

import { cn } from "@/lib/utils";
import { USER_NAVIGATION_PANEL_MAX_HEIGHT } from "@/lib/user-mobile-shell";
import { Button, buttonVariants } from "@/components/ui/Button";
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
            <Button variant="outline" size="sm"
                ref={triggerRef}
                type="button"
                aria-label="Open admin workspace"
                title="Admin workspace"
                aria-expanded={isOpen}
                aria-haspopup="menu"
                aria-controls={isOpen ? menuId : undefined}
                onClick={onToggle}
                className={cn(
                    "gap-2 rounded-2xl",
                    isOpen && "bg-secondary",
                )}
            >
                <ShieldCheck aria-hidden="true" className="relative h-4 w-4" />
                <span className="relative hidden sm:inline">Control tower</span>
                <ChevronDown aria-hidden="true" className={cn("relative h-3.5 w-3.5 transition-transform duration-200", isOpen && "rotate-180")} />
            </Button>

            {isOpen ? (
                <div
                    ref={menuRef}
                    id={menuId}
                    role="menu"
                    aria-label="Admin workspace menu"
                    onKeyDown={onMenuKeyDown}
                    style={{ maxHeight: USER_NAVIGATION_PANEL_MAX_HEIGHT }}
                    className="absolute right-0 top-full z-50 mt-3 w-[min(24rem,calc(100vw-1.5rem))] overflow-y-auto rounded-2xl border border-border bg-popover p-3 text-foreground shadow-lg"
                >

                    <div className="relative space-y-3">
                        <header className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-3">
                            <span className="min-w-0"><KandyBrandLockup /></span>
                            <span className="shrink-0 rounded-full border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-primary">Admin</span>
                        </header>

                        {homeItem ? (
                            <Link
                                href={homeItem.href}
                                role="menuitem"
                                onClick={() => onNavigate(homeItem.href)}
                                className={buttonVariants({ variant: "ghost", className: "w-full justify-between rounded-xl text-foreground" })}
                            >
                                <span className="flex items-center gap-2"><homeItem.icon aria-hidden="true" className="h-4 w-4 text-primary" /> Return to KandyDrops</span>
                                <span aria-hidden="true" className="text-primary">↗</span>
                            </Link>
                        ) : null}

                        <section aria-label="Admin workspaces">
                            <p className="mb-2 px-1 text-xs font-medium text-muted-foreground">Operational areas</p>
                            <div className="flex flex-col gap-1">
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
                                                buttonVariants({ variant: "ghost", className: "w-full justify-start gap-3 rounded-xl text-foreground" }),
                                                isActive && "bg-secondary",
                                            )}
                                        >
                                            <Icon aria-hidden="true" className={cn("relative h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
                                            <span className="min-w-0 text-sm font-medium leading-tight">{item.label}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </section>

                        <Button variant="danger"
                            type="button"
                            role="menuitem"
                            onClick={onLogout}
                            className="w-full justify-between rounded-xl px-3 text-left text-sm"
                        >
                            <span className="flex items-center gap-2"><LogOut aria-hidden="true" className="h-4 w-4" /> End admin session</span>
                            <span className="text-xs font-medium text-destructive">Sign out</span>
                        </Button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
