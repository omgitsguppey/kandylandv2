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
  ADMIN_CONSOLE_STICKY_TOP_CLASS,
  ADMIN_CONSOLE_TO_CONTENT_GAP_CLASS,
  ADMIN_SHELL_GAP_MD_TOKEN,
  ADMIN_SHELL_GAP_TOKEN,
} from "@/lib/admin-shell-spacing";


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
    <div className="flex-1 w-full bg-transparent">
      <main
        className="w-full px-3 pb-8 md:px-8 md:pb-10"
        data-admin-shell-spacing="shared"
        data-admin-top-to-console-gap={ADMIN_SHELL_GAP_TOKEN}
        data-admin-console-to-content-gap={ADMIN_SHELL_GAP_TOKEN}
        data-admin-console-to-content-gap-md={ADMIN_SHELL_GAP_MD_TOKEN}
      >
        <div className="max-w-7xl mx-auto">
          <div
            className={cn("sticky z-30", ADMIN_CONSOLE_STICKY_TOP_CLASS, ADMIN_CONSOLE_TO_CONTENT_GAP_CLASS)}
            data-admin-console-nav="true"
            data-admin-shell-gap-class={ADMIN_CONSOLE_TO_CONTENT_GAP_CLASS}
          >
            <div className="rounded-[1.75rem] border border-white/10 bg-black/75 p-2.5 backdrop-blur-xl shadow-xl shadow-black/25">
              <div className="mb-2 px-1 md:hidden">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Admin Console</p>
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
                        "rounded-2xl border px-3 py-3 text-left transition-colors",
                        active ? "bg-brand-purple/15 border-brand-purple/40 text-white" : "bg-white/5 border-white/10 text-gray-300"
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
                          "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs md:text-sm font-medium border",
                          active ? "bg-brand-purple/20 border-brand-purple/40 text-white" : "bg-white/5 border-white/10 text-gray-300"
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
          <AdminErrorCatcher />
          {children}
        </div>
      </main>
    </div>
  );
}
