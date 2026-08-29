"use client";

import Image from "next/image";
import Link from "next/link";
import {
    LayoutDashboard,
    LifeBuoy,
    ListChecks,
    Package,
    ShieldAlert,
    Terminal,
    TrendingUp,
    Users,
    type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

type AdminNavigationItem = {
    href: string;
    label: string;
    icon: LucideIcon;
};

type AdminNavigationGroup = {
    label: string;
    items: AdminNavigationItem[];
};

type AdminControlTowerNavigationProps = {
    pathname: string | null;
};

const ADMIN_NAVIGATION_GROUPS: AdminNavigationGroup[] = [
    {
        label: "Command",
        items: [
            { href: "/admin", label: "Home", icon: LayoutDashboard },
            { href: "/admin/analytics", label: "Analytics", icon: TrendingUp },
            { href: "/admin/drops", label: "Drops", icon: Package },
            { href: "/admin/users", label: "Users", icon: Users },
            { href: "/admin/roster", label: "Roster", icon: ListChecks },
        ],
    },
    {
        label: "Operations",
        items: [
            { href: "/admin/support", label: "Support", icon: LifeBuoy },
            { href: "/admin/moderation", label: "Moderation", icon: ShieldAlert },
            { href: "/admin/content", label: "Content", icon: Package },
            { href: "/admin/economy", label: "Economy", icon: TrendingUp },
            { href: "/admin/privacy", label: "Privacy", icon: ShieldAlert },
        ],
    },
    {
        label: "Evidence",
        items: [
            { href: "/admin/debug", label: "Debug", icon: Terminal },
            { href: "/admin/ai", label: "AI", icon: Terminal },
        ],
    },
];

const ADMIN_NAVIGATION_ITEMS = ADMIN_NAVIGATION_GROUPS.flatMap((group) => group.items);

function isActiveRoute(pathname: string | null, href: string) {
    if (!pathname) {
        return false;
    }

    return href === "/admin"
        ? pathname === href
        : pathname === href || pathname.startsWith(`${href}/`);
}

function AdminBrand() {
    return (
        <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/20 bg-gradient-to-br from-brand-pink/80 via-brand-purple to-kandy-lilac/70 p-1 shadow-lg shadow-brand-purple/25">
                <Image src="/candy-main.svg" alt="" width={44} height={44} className="h-9 w-9 object-contain" priority />
            </span>
            <span className="min-w-0">
                <span className="block text-xs font-bold uppercase tracking-[0.18em] text-kandy-lilac/80">KandyDrops</span>
                <span className="block truncate font-serif text-lg font-black text-white">Control Tower</span>
            </span>
        </div>
    );
}

function AdminNavigationLink({ item, pathname, compact = false }: {
    item: AdminNavigationItem;
    pathname: string | null;
    compact?: boolean;
}) {
    const Icon = item.icon;
    const active = isActiveRoute(pathname, item.href);

    return (
        <Link
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
                compact
                    ? "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition-colors"
                    : "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors",
                active
                    ? "border-brand-purple/45 bg-gradient-to-r from-brand-purple/30 to-brand-pink/15 text-white shadow-lg shadow-brand-purple/10"
                    : compact
                        ? "border-white/10 bg-white/[0.035] text-gray-300 hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                        : "text-gray-300 hover:bg-white/[0.07] hover:text-white",
            )}
        >
            <Icon className={cn("h-4 w-4 shrink-0", active ? "text-kandy-lilac" : "text-gray-500")} />
            <span>{item.label}</span>
        </Link>
    );
}

export function AdminControlTowerNavigation({ pathname }: AdminControlTowerNavigationProps) {
    return (
        <section
            className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/45 shadow-2xl shadow-black/25 backdrop-blur-xl"
            data-admin-console-flow="normal"
            data-admin-console-nav="true"
            data-admin-control-tower-navigation="true"
        >
            <div aria-hidden="true" className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-kandy-lilac/75 to-transparent" />
            <div aria-hidden="true" className="absolute -right-10 top-10 h-28 w-28 rounded-full bg-brand-purple/15 blur-3xl" />

            <div className="relative lg:hidden">
                <div className="flex items-center justify-between gap-3 px-3 py-3">
                    <AdminBrand />
                    <span className="rounded-full border border-kandy-lilac/20 bg-kandy-lilac/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-kandy-lilac">Admin</span>
                </div>
                <div className="overflow-x-auto border-t border-white/10 px-3 py-2">
                    <div className="flex min-w-max gap-2">
                        {ADMIN_NAVIGATION_ITEMS.map((item) => (
                            <AdminNavigationLink key={item.href} item={item} pathname={pathname} compact />
                        ))}
                    </div>
                </div>
            </div>

            <aside className="hidden w-64 p-3 lg:block" aria-label="Admin control tower navigation">
                <AdminBrand />
                <div className="mt-4 border-t border-white/10 pt-3">
                    {ADMIN_NAVIGATION_GROUPS.map((group) => (
                        <section key={group.label} className="mb-4 last:mb-0">
                            <p className="px-3 text-xs font-bold uppercase tracking-[0.16em] text-gray-500">{group.label}</p>
                            <div className="mt-1.5 space-y-1">
                                {group.items.map((item) => (
                                    <AdminNavigationLink key={item.href} item={item} pathname={pathname} />
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            </aside>
        </section>
    );
}
