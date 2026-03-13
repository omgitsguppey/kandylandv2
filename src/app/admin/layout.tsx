"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { LayoutDashboard, Package, Users, Terminal, ListChecks, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";


const NAV_ITEMS = [
  { href: "/admin", label: "Home", icon: LayoutDashboard },
  { href: "/admin/analytics", label: "Analytics", icon: TrendingUp },
  { href: "/admin/drops", label: "Drops", icon: Package },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/roster", label: "Roster", icon: ListChecks },
  { href: "/admin/debug", label: "Debug", icon: Terminal },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isAuthorized = !!user && userProfile?.role === "admin";

  useEffect(() => {
    if (!authLoading && !isAuthorized) {
      router.push("/");
    }
  }, [authLoading, isAuthorized, router]);

  if (authLoading || !isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-brand-purple border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 w-full bg-transparent">
      <main className="w-full px-3 pb-8 pt-24 md:px-8 md:pb-10 md:pt-28">
        <div className="max-w-7xl mx-auto">
          <div className="sticky top-[calc(4.15rem+env(safe-area-inset-top))] z-30 mb-6 md:top-[5.15rem] md:mb-8">
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
          {children}
        </div>
      </main>
    </div>
  );
}
