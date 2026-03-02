"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { NotificationPromptBanner } from "@/components/Dashboard/NotificationPromptBanner";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push("/");
        }
    }, [user, loading, router]);

    if (loading || !user) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center">
                <div className="w-10 h-10 rounded-full border-[3px] border-brand-pink/20 border-t-brand-pink animate-spin mb-4" />
                <p className="text-brand-pink/80 text-sm tracking-widest uppercase font-medium mt-2">Please wait</p>
            </div>
        );
    }

    return (
        <div className="flex-1 w-full relative">
            <NotificationPromptBanner />
            <div className="w-full">
                {children}
            </div>
        </div>
    );
}
