"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

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

export function KandyBrandLockup() {
    return (
        <span className="flex min-w-0 items-center gap-2">
            <span
                aria-hidden="true"
                className="relative grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-md border border-white/20 bg-white/[0.08]"
            >
                <span className="absolute inset-1 rounded-sm border border-white/20" />
                <Image
                    src="/candy-main.svg"
                    alt=""
                    width={44}
                    height={44}
                    priority
                    className="relative h-9 w-9 object-contain p-1"
                />
            </span>
            <span className="hidden min-w-0 flex-col sm:flex">
                <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/50">Kandy</span>
                <span className="-mt-1 font-serif text-lg font-black tracking-tight text-white">Drops</span>
            </span>
        </span>
    );
}

export function KandyTopNavigationFrame({ children }: KandyTopNavigationFrameProps) {
    return (
        <div className="mx-auto flex min-h-12 max-w-7xl items-center justify-between gap-3">
            {children}
        </div>
    );
}

export function KandyDesktopNavigation({ items, pathname, onNavigate }: KandyDesktopNavigationProps) {
    const activeHref = resolveActiveHref(items, pathname);

    return (
        <div aria-label="Primary navigation" className="hidden min-w-0 flex-1 items-center justify-center lg:flex">
            <div className="flex items-center gap-1 border-x border-white/10 px-2">
                {items.map((item) => {
                    const isActive = item.href === activeHref;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            aria-current={isActive ? "page" : undefined}
                            onClick={() => onNavigate(item.href)}
                            className={cn(
                                "inline-flex min-h-10 items-center border-b-2 border-transparent px-3 text-sm font-semibold transition-colors",
                                isActive
                                    ? "border-white text-white"
                                    : "text-gray-400 hover:text-white",
                            )}
                        >
                            {item.label}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}

export function KandyMobileNavigationDock({ children, platformShell }: KandyMobileNavigationDockProps) {
    return (
        <nav
            aria-label="Mobile navigation"
            className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl border border-white/15 bg-[#0a0a0b]/95 shadow-2xl shadow-black/45 backdrop-blur-2xl"
            data-bottom-nav-role="navigation"
            data-bottom-nav-visual-height="56"
            data-device-layout-contract="2026-05-public-beta"
            data-device-layout-surface="mobile-bottom-nav"
            data-hydration-lane="critical"
            data-platform-shell={platformShell}
        >
            <div className="relative flex h-14 items-center justify-between gap-1 px-2">{children}</div>
        </nav>
    );
}
