"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { AdminErrorCatcher } from "@/components/AdminErrorCatcher";
import { AdminControlTowerNavigation } from "@/components/creative-tim/kandydrops/admin/AdminControlTowerNavigation";
import { useAuth } from "@/context/AuthContext";
import { resolveAdminBrowserSurfaceForPathname } from "@/lib/admin/admin-browser-surface-map";
import {
    ADMIN_CONSOLE_FLOW_CLASS,
    ADMIN_CONSOLE_TO_CONTENT_GAP_CLASS,
    ADMIN_SHELL_GAP_MD_TOKEN,
    ADMIN_SHELL_GAP_TOKEN,
    ADMIN_TOP_TO_CONSOLE_GAP_CLASS,
} from "@/lib/admin-shell-spacing";
import { readPreferredAuthenticatedPath } from "@/lib/navigation-persistence";
import { cn } from "@/lib/utils";

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
            <div className="flex min-h-screen items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-purple border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="relative isolate w-full flex-1 overflow-x-clip bg-kandy-void">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(139,92,246,0.16),_transparent_34rem)]" />
            <div aria-hidden="true" className="pointer-events-none absolute right-0 top-40 h-96 w-96 rounded-full bg-brand-pink/10 blur-3xl" />
            <main
                className="relative z-10 w-full px-3 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-1 md:px-8 md:pb-10 md:pt-2"
                data-admin-console-to-content-gap={ADMIN_SHELL_GAP_TOKEN}
                data-admin-console-to-content-gap-md={ADMIN_SHELL_GAP_MD_TOKEN}
                data-admin-shell-spacing="shared"
                data-admin-top-to-console-gap={ADMIN_SHELL_GAP_TOKEN}
            >
                <div className="mx-auto max-w-7xl">
                    <div
                        className={cn(
                            ADMIN_CONSOLE_FLOW_CLASS,
                            ADMIN_TOP_TO_CONSOLE_GAP_CLASS,
                            "grid gap-3 lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start md:gap-4",
                        )}
                        data-admin-console-flow="normal"
                        data-admin-shell-top-gap-class={ADMIN_TOP_TO_CONSOLE_GAP_CLASS}
                    >
                        <div className="lg:sticky lg:top-24">
                            <AdminControlTowerNavigation pathname={pathname} />
                        </div>
                        <div
                            className={cn(ADMIN_CONSOLE_TO_CONTENT_GAP_CLASS, "relative lg:mt-0")}
                            data-admin-browser-route={browserSurface?.route ?? pathname}
                            data-admin-browser-surface={browserSurface?.surfaceId ?? "unknown"}
                            data-admin-browser-surface-group={browserSurface?.group ?? "unknown"}
                            data-admin-page-content="true"
                            data-admin-shell-below-console-gap-class={ADMIN_CONSOLE_TO_CONTENT_GAP_CLASS}
                        >
                            <AdminErrorCatcher />
                            {children}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
