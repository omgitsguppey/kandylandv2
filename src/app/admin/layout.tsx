"use client";

import { useAuth } from "@/context/AuthContext";
import { readPreferredAuthenticatedPath } from "@/lib/navigation-persistence";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { LayoutDashboard, Package, Users, Terminal, ListChecks, TrendingUp, LifeBuoy, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminErrorCatcher } from "@/components/AdminErrorCatcher";
import {
  ADMIN_CONSOLE_FLOW_CLASS,
  ADMIN_CONSOLE_TO_CONTENT_GAP_CLASS,
  ADMIN_SHELL_GAP_MD_TOKEN,
  ADMIN_SHELL_GAP_TOKEN,
  ADMIN_TOP_TO_CONSOLE_GAP_CLASS,
} from "@/lib/admin-shell-spacing";
import { resolveAdminBrowserSurfaceForPathname } from "@/lib/admin/admin-browser-surface-map";


const NAV_ITEMS = [
  { href: "/admin", label: "Home", icon: LayoutDashboard },
  { href: "/admin/analytics", label: "Analytics", icon: TrendingUp },
  { href: "/admin/drops", label: "Drops", icon: Package },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/roster", label: "Roster", icon: ListChecks },
  { href: "/admin/debug", label: "Debug", icon: Terminal },
  { href: "/admin/ai", label: "AI", icon: Terminal },
  { href: "/admin/support", label: "Support", icon: LifeBuoy },
  { href: "/admin/moderation", label: "Moderation", icon: ShieldAlert },
  { href: "/admin/content", label: "Content", icon: Package },
  { href: "/admin/economy", label: "Economy", icon: TrendingUp },
  { href: "/admin/privacy", label: "Privacy", icon: ShieldAlert },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isAuthorized = !!user && userProfile?.role === "admin";
  const browserSurface = resolveAdminBrowserSurfaceForPathname(pathname);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      router.replace("/");
      return;
    }

    if (userProfile?.role && userProfile.role !== "admin") {
      router.replace(readPreferredAuthenticatedPath(userProfile.role, user.uid));
    }
  }, [authLoading, router, user, userProfile?.role]);

  if (authLoading || !isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-brand-purple border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative isolate flex-1 w-full overflow-x-clip bg-[radial-gradient(circle_at_top,_rgba(139,92,246,0.16),_transparent_32rem)]">
      <main
        className="relative z-10 w-full px-3 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-1 md:px-8 md:pb-10 md:pt-2"
        data-admin-shell-spacing="shared"
        data-admin-top-to-console-gap={ADMIN_SHELL_GAP_TOKEN}
        data-admin-console-to-content-gap={ADMIN_SHELL_GAP_TOKEN}
        data-admin-console-to-content-gap-md={ADMIN_SHELL_GAP_MD_TOKEN}
      >
        <div className="max-w-7xl mx-auto">
          <div
            className={cn(ADMIN_CONSOLE_FLOW_CLASS, ADMIN_TOP_TO_CONSOLE_GAP_CLASS)}
            data-admin-console-nav="true"
            data-admin-console-flow="normal"
            data-admin-shell-top-gap-class={ADMIN_TOP_TO_CONSOLE_GAP_CLASS}
          >
            <div className="relative overflow-hidden rounded-[1.9rem] border border-brand-purple/20 bg-black/75 p-2.5 shadow-2xl shadow-black/35 backdrop-blur-xl">
              <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-brand-purple/70 to-transparent" />
              <div className="mb-2 px-1 md:hidden">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Admin Console</p>
              </div>
              <div className="grid grid-cols-3 gap-2 md:hidden">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex min-h-11 flex-col justify-center rounded-2xl border px-3 py-3 text-left transition-colors",
                        active
                          ? "border-brand-purple/60 bg-brand-purple/20 text-white shadow-lg shadow-brand-purple/10"
                          : "border-white/10 bg-white/[0.035] text-gray-300 hover:border-white/20 hover:bg-white/[0.07]"
                      )}
                    >
                      <Icon className={cn("mb-2 h-4 w-4", active ? "text-brand-purple" : "text-gray-400")} />
                      <div className="text-[11px] font-bold leading-tight">{item.label}</div>
                    </Link>
                  );
                })}
              </div>
              <div className="hidden overflow-x-auto md:block">
                <div className="flex gap-2 min-w-max">
                  {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const active = pathname === item.href;
                    return (
                      <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                          "inline-flex min-h-11 items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-medium transition-colors md:text-sm",
                          active
                            ? "border-brand-purple/60 bg-brand-purple/20 text-white shadow-lg shadow-brand-purple/10"
                            : "border-white/10 bg-white/[0.035] text-gray-300 hover:border-white/20 hover:bg-white/[0.07]"
                        )}
                      >
                        <Icon className="w-4 h-4" /> {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          <div
            className={cn(ADMIN_CONSOLE_TO_CONTENT_GAP_CLASS, "relative")}
            data-admin-page-content="true"
            data-admin-browser-surface={browserSurface?.surfaceId ?? "unknown"}
            data-admin-browser-route={browserSurface?.route ?? pathname}
            data-admin-browser-surface-group={browserSurface?.group ?? "unknown"}
            data-admin-shell-below-console-gap-class={ADMIN_CONSOLE_TO_CONTENT_GAP_CLASS}
          >
            <AdminErrorCatcher />
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
