"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode, RefObject } from "react";
import { DEVICE_PRIMARY_NAVIGATION_CLASSES, DEVICE_LAYOUT_COMPONENT_SIZING } from "@/lib/device-layout-contract";
import { USER_MOBILE_BOTTOM_NAV_MIN_HEIGHT } from "@/lib/user-mobile-shell";

import {
    NavigationMenu,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
} from "@/components/creative-tim/ui/navigation-menu";

export type KandyDesktopNavigationItem = {
    label: string;
    href: string;
};

type KandyTopNavigationFrameProps = {
    children: ReactNode;
};

type KandyDesktopNavigationProps = {
    items: KandyDesktopNavigationItem[];
    pathname: string | null;
    onNavigate: (destination: string) => void;
};

type KandyMobileNavigationDockProps = {
    children: ReactNode;
    platformShell: "default" | "ios-pwa";
    dockRef: RefObject<HTMLElement | null>;
};

function resolveActiveHref(items: KandyDesktopNavigationItem[], pathname: string | null) {
    if (!pathname) {
        return null;
    }

    return [...items]
        .sort((left, right) => right.href.length - left.href.length)
        .find((item) => item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`))
        ?.href ?? null;
}

export function KandyBrandMark() {
    return (
        <Image
            src="/logo-k-monogram.png"
            alt=""
            width={44}
            height={44}
            preload
            className="size-11 shrink-0 object-contain"
        />
    );
}

export function KandyBrandLockup() {
    return (
        <span className="flex min-w-0 items-center gap-2">
            <KandyBrandMark />
            <span className="hidden min-w-0 flex-col sm:flex">
                <span className="text-lg font-semibold tracking-tight text-foreground">KandyDrops</span>
            </span>
        </span>
    );
}

export function KandyTopNavigationFrame({ children }: KandyTopNavigationFrameProps) {
    return (
        <div className={DEVICE_PRIMARY_NAVIGATION_CLASSES.frame}>
            {children}
        </div>
    );
}

export function KandyDesktopNavigation({ items, pathname, onNavigate }: KandyDesktopNavigationProps) {
    const activeHref = resolveActiveHref(items, pathname);

    return (
        <div className={DEVICE_PRIMARY_NAVIGATION_CLASSES.expanded}>
            <NavigationMenu aria-label="Primary navigation" viewport={false} className="max-w-full">
                <NavigationMenuList className="flex-wrap gap-1">
                    {items.map((item) => {
                        const isActive = item.href === activeHref;

                        return (
                            <NavigationMenuItem key={item.href}>
                                <NavigationMenuLink
                                    asChild
                                    active={isActive}
                                    className="min-h-11 flex-row items-center rounded-full px-4 py-2 font-medium text-foreground motion-reduce:transition-none"
                                >
                                    <Link
                                        href={item.href}
                                        aria-current={isActive ? "page" : undefined}
                                        onClick={() => onNavigate(item.href)}
                                    >
                                        {item.label}
                                    </Link>
                                </NavigationMenuLink>
                            </NavigationMenuItem>
                        );
                    })}
                </NavigationMenuList>
            </NavigationMenu>
        </div>
    );
}

export function KandyMobileNavigationDock({ children, platformShell, dockRef }: KandyMobileNavigationDockProps) {
    return (
        <nav
            ref={dockRef}
            aria-label="Mobile navigation"
            className="navigation-material pointer-events-auto relative mx-auto max-w-7xl overflow-hidden rounded-3xl"
            data-bottom-nav-role="navigation"
            data-bottom-nav-min-visual-height={DEVICE_LAYOUT_COMPONENT_SIZING.bottomNavVisualHeightPx}
            data-device-layout-contract="2026-05-public-beta"
            data-device-layout-surface="mobile-bottom-nav"
            data-hydration-lane="critical"
            data-platform-shell={platformShell}
        >
            <div className="relative flex items-stretch justify-between gap-1 px-2 py-1" style={{ minHeight: USER_MOBILE_BOTTOM_NAV_MIN_HEIGHT }}>{children}</div>
        </nav>
    );
}
