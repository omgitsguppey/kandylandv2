"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/context/AuthContext";
const NotificationPromptBanner = dynamic(
    () => import("@/components/Dashboard/NotificationPromptBanner").then((mod) => mod.NotificationPromptBanner),
);

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, userProfile, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const shouldShowNotificationPromptBanner = pathname !== "/dashboard/chat";

    useEffect(() => {
        if (loading) {
            return;
        }

        if (!user) {
            router.replace("/");
            return;
        }

    }, [loading, router, user]);

    if (loading || !user) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-black">
                <div className="mb-4 h-10 w-10 animate-spin rounded-full border-[3px] border-brand-purple/20 border-t-brand-purple" />
                <p className="mt-2 text-sm font-medium uppercase tracking-widest text-brand-purple/80">Please wait</p>
            </div>
        );
    }

    return (
        <div className="relative flex-1 flex flex-col w-full min-h-0">
            <div className="w-full flex-1 flex flex-col min-h-0 space-y-2 pb-2 sm:space-y-3 sm:pb-3">
                {shouldShowNotificationPromptBanner ? <NotificationPromptBanner /> : null}
                <div className="w-full flex-1 flex flex-col min-h-0 relative z-0">{children}</div>
            </div>
        </div>
    );
}
