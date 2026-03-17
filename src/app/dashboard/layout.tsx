"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/context/AuthContext";
import { readPreferredAuthenticatedPath } from "@/lib/navigation-persistence";

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

    useEffect(() => {
        if (loading) {
            return;
        }

        if (!user) {
            router.replace("/");
            return;
        }

        if (userProfile?.role === "admin") {
            router.replace(readPreferredAuthenticatedPath("admin"));
        }
    }, [loading, router, user, userProfile?.role]);

    if (loading || !user) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-black">
                <div className="mb-4 h-10 w-10 animate-spin rounded-full border-[3px] border-brand-purple/20 border-t-brand-purple" />
                <p className="mt-2 text-sm font-medium uppercase tracking-widest text-brand-purple/80">Please wait</p>
            </div>
        );
    }

    return (
        <div className="relative flex-1 w-full">
            <NotificationPromptBanner />
            <div className="w-full">{children}</div>
        </div>
    );
}
