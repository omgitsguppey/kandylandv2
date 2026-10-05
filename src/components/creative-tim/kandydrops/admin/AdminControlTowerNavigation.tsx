"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    LayoutDashboard, House, LifeBuoy, ListChecks, Package, ShieldAlert,
    Terminal, TrendingUp, Users, type LucideIcon,
} from "lucide-react";

import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { KandyBrandMark } from "@/components/creative-tim/kandydrops/navigation/KandyNavigationPrimitives";
import { cn } from "@/lib/utils";

type AdminNavigationItem = { href: string; label: string; icon: LucideIcon };
type AdminNavigationGroup = { label: string; items: AdminNavigationItem[] };
type AdminControlTowerNavigationProps = { pathname: string | null };

const ADMIN_NAVIGATION_GROUPS: AdminNavigationGroup[] = [
    { label: "Command", items: [
        { href: "/admin", label: "Home", icon: LayoutDashboard },
        { href: "/admin/analytics", label: "Analytics", icon: TrendingUp },
        { href: "/admin/drops", label: "Drops", icon: Package },
        { href: "/admin/users", label: "Users", icon: Users },
        { href: "/admin/roster", label: "Roster", icon: ListChecks },
    ] },
    { label: "Operations", items: [
        { href: "/admin/support", label: "Support", icon: LifeBuoy },
        { href: "/admin/moderation", label: "Moderation", icon: ShieldAlert },
        { href: "/admin/content", label: "Content", icon: Package },
        { href: "/admin/economy", label: "Economy", icon: TrendingUp },
        { href: "/admin/privacy", label: "Privacy", icon: ShieldAlert },
    ] },
    { label: "Evidence", items: [
        { href: "/admin/debug", label: "Debug", icon: Terminal },
        { href: "/admin/ai", label: "AI", icon: Terminal },
    ] },
];

const ADMIN_NAVIGATION_ITEMS = ADMIN_NAVIGATION_GROUPS.flatMap((group) => group.items);

function resolveActiveRoute(pathname: string | null) {
    if (pathname?.startsWith("/admin/user/")) return "/admin/users";
    return ADMIN_NAVIGATION_ITEMS.find(({ href }) => href === "/admin"
        ? pathname === href
        : pathname === href || pathname?.startsWith(`${href}/`))?.href ?? null;
}

function AdminBrand() {
    return (
        <div className="flex min-w-0 max-w-full items-center gap-3">
            <KandyBrandMark />
            <span className="min-w-0">
                <span className="block text-xs font-medium text-muted-foreground">KandyDrops</span>
                <span className="block whitespace-normal wrap-anywhere text-lg font-semibold tracking-tight text-foreground">Control Tower</span>
            </span>
        </div>
    );
}

function AdminNavigationLink({ item, activeHref }: { item: AdminNavigationItem; activeHref: string | null }) {
    const Icon = item.icon;
    const active = activeHref === item.href;
    return (
        <Link href={item.href} aria-current={active ? "page" : undefined}
            className={cn(
                "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active ? "bg-secondary text-primary" : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground",
            )}>
            <Icon aria-hidden="true" className="size-4 shrink-0" />
            <span>{item.label}</span>
        </Link>
    );
}

function ViewSiteLink() {
    return (
        <Link href="/" className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium text-primary transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <House aria-hidden="true" className="size-4" />View site
        </Link>
    );
}

export function AdminControlTowerNavigation({ pathname }: AdminControlTowerNavigationProps) {
    const router = useRouter();
    const activeHref = resolveActiveRoute(pathname);

    return (
        <section className="navigation-material min-w-0 max-w-full rounded-2xl border border-border"
            data-admin-console-flow="normal" data-admin-console-nav="true" data-admin-control-tower-navigation="true">
            <div className="lg:hidden">
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 px-3 py-3">
                    <AdminBrand /><ViewSiteLink />
                </div>
                <nav aria-label="Admin control tower navigation" className="min-w-0 max-w-full border-t border-border p-3">
                    <NativeSelect aria-label="Admin section" value={activeHref ?? ""}
                        onChange={(event) => {
                            const destination = event.target.value;
                            if (destination !== activeHref && ADMIN_NAVIGATION_ITEMS.some(({ href }) => href === destination)) {
                                router.push(destination);
                            }
                        }}>
                        {!activeHref ? <NativeSelectOption value="" disabled>Select Admin section</NativeSelectOption> : null}
                        {ADMIN_NAVIGATION_GROUPS.map((group) => (
                            <optgroup key={group.label} label={group.label}>
                                {group.items.map((item) => <NativeSelectOption key={item.href} value={item.href}>{item.label}</NativeSelectOption>)}
                            </optgroup>
                        ))}
                    </NativeSelect>
                </nav>
            </div>

            <aside className="hidden w-64 p-3 lg:block" aria-label="Admin control tower navigation">
                <AdminBrand />
                <div className="mt-3"><ViewSiteLink /></div>
                <div className="mt-3 space-y-4 border-t border-border pt-3">
                    {ADMIN_NAVIGATION_GROUPS.map((group) => (
                        <section key={group.label}>
                            <p className="px-3 text-xs font-semibold text-muted-foreground">{group.label}</p>
                            <div className="mt-1 space-y-1">
                                {group.items.map((item) => <AdminNavigationLink key={item.href} item={item} activeHref={activeHref} />)}
                            </div>
                        </section>
                    ))}
                </div>
            </aside>
        </section>
    );
}
