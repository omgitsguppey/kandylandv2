"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronDown, LogOut, type LucideIcon } from "lucide-react";
import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from "react";

import { cn } from "@/lib/utils";
import { USER_NAVIGATION_PANEL_MAX_HEIGHT } from "@/lib/user-mobile-shell";
import { Button, buttonVariants } from "@/components/ui/Button";

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
            <Button variant="outline" size="sm"
                ref={triggerRef}
                type="button"
                aria-label={`${isOpen ? "Close" : "Open"} account menu for ${primaryIdentity}`}
                title="Kandy account"
                aria-expanded={isOpen}
                aria-haspopup="menu"
                aria-controls={isOpen ? menuId : undefined}
                onClick={onToggle}
                className={cn(
                    "group gap-2 rounded-2xl px-2 text-left",
                    isOpen && "bg-secondary",
                )}
            >
                <span className="relative grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-secondary text-sm font-semibold text-foreground">
                    {avatarUrl ? (
                        <Image src={avatarUrl} alt="" fill sizes="32px" className="object-cover" />
                    ) : (
                        displayName.charAt(0)?.toUpperCase() || "U"
                    )}
                </span>
                <span className="hidden min-w-0 flex-1 flex-col pr-1 sm:flex">
                    <span className="truncate text-xs font-semibold leading-tight text-foreground">{primaryIdentity}</span>
                    <span className="truncate text-xs font-medium text-muted-foreground">Account</span>
                </span>
                <ChevronDown aria-hidden="true" className={cn("h-4 w-4 shrink-0 text-primary transition-transform duration-200", isOpen && "rotate-180")} />
            </Button>

            {isOpen ? (
                <div
                    ref={menuRef}
                    id={menuId}
                    role="menu"
                    aria-label="Kandy account menu"
                    onKeyDown={onMenuKeyDown}
                    style={{ maxHeight: USER_NAVIGATION_PANEL_MAX_HEIGHT }}
                    className="absolute right-0 top-full z-50 mt-3 w-[min(24rem,calc(100vw-1.5rem))] overflow-y-auto rounded-2xl border border-border bg-popover p-3 text-foreground shadow-lg"
                >

                    <div className="relative space-y-3">
                        <header className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                            <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl border border-border bg-secondary text-base font-semibold text-foreground">
                                {avatarUrl ? (
                                    <Image src={avatarUrl} alt={displayName} width={48} height={48} className="h-12 w-12 object-cover" />
                                ) : (
                                    displayName.charAt(0)?.toUpperCase() || "U"
                                )}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="flex flex-wrap items-center gap-2">
                                    <span className="truncate text-sm font-semibold text-foreground">{primaryIdentity}</span>
                                    {isAdmin ? <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-xs font-medium text-primary">Admin</span> : null}
                                </span>
                                <span className="mt-0.5 block truncate text-xs text-muted-foreground">{secondaryIdentity}</span>
                            </span>
                            <Link
                                href={accountHref}
                                role="menuitem"
                                aria-label="Open account settings"
                                onClick={() => onNavigate(accountHref)}
                                className={buttonVariants({ variant: "outline", size: "sm", className: "shrink-0 rounded-xl text-xs" })}
                            >
                                Account
                            </Link>
                        </header>

                        {navigationSections.map((section) => (
                            <section key={section.label} aria-label={section.label}>
                                <p className="mb-2 px-1 text-xs font-medium text-muted-foreground">{section.label}</p>
                                <div className={cn(
                                    "flex flex-col gap-1",
                                )}>
                                    {section.items.map((item) => {
                                        const Icon = item.icon;

                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                role="menuitem"
                                                onClick={() => onNavigate(item.href)}
                                                className={buttonVariants({ variant: "ghost", className: "group w-full justify-start gap-3 rounded-xl text-foreground" })}
                                            >
                                                <span className="relative flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-card text-primary">
                                                    <Icon aria-hidden="true" className="h-4 w-4" />
                                                    {item.hasUnreadIndicator ? <><span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-popover bg-primary" /><span className="sr-only">Unread messages</span></> : null}
                                                </span>
                                                <span className="min-w-0 text-left text-sm font-medium leading-tight text-foreground">{item.label}</span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </section>
                        ))}

                        <Button variant="danger"
                            type="button"
                            role="menuitem"
                            onClick={onLogout}
                            className="w-full justify-between rounded-xl px-3 text-left text-sm"
                        >
                            <span className="flex items-center gap-2"><LogOut aria-hidden="true" className="h-4 w-4" /> End session</span>
                            <span className="text-xs font-medium text-destructive">Sign out</span>
                        </Button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
