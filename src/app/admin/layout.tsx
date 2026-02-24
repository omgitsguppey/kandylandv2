"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { LayoutDashboard, PlusCircle, Package, Users, Terminal, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";

const ADMIN_EMAIL = "uylusjohnson@gmail.com";

const NAV_ITEMS = [
  { href: "/admin", label: "Home", icon: LayoutDashboard },
  { href: "/admin/drops", label: "Drops", icon: Package },
  { href: "/admin/create", label: "Create", icon: PlusCircle },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/roster", label: "Roster", icon: ListChecks },
  { href: "/admin/debug", label: "Debug", icon: Terminal },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!user || user.email !== ADMIN_EMAIL) router.push("/");
      else setIsAuthorized(true);
    }
  }, [user, authLoading, router]);

  if (authLoading || !isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-brand-pink border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 w-full bg-transparent pb-20 md:pb-0">
      <main className="w-full p-3 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-4 md:mb-6 overflow-x-auto rounded-2xl border border-white/10 bg-black/30 p-2">
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
                      active ? "bg-brand-pink/20 border-brand-pink/40 text-white" : "bg-white/5 border-white/10 text-gray-300"
                    )}
                  >
                    <Icon className="w-4 h-4" /> {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
