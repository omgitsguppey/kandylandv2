"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { LayoutDashboard, Library, Settings, LogOut, Menu, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardProfileListener } from "@/components/DashboardProfileListener";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, loading, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

    useEffect(() => {
        if (!loading && !user) {
            router.push("/");
        }
    }, [user, loading, router]);

    if (loading || !user) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-brand-pink border-t-transparent animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex-1 w-full relative">
            {/* Listener for Realtime Profile Updates in Dashboard */}
            <DashboardProfileListener />

            <div className="w-full">
                {children}
            </div>
        </div>
    );
}
