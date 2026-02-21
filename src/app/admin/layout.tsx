"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CandyOutlineIcon as LayoutDashboard, CandyOutlineIcon as PlusCircle, CandyOutlineIcon as LogOut, CandyOutlineIcon as Package, CandyOutlineIcon as Users, CandyOutlineIcon as Terminal } from "@/components/ui/Icon";

import { cn } from "@/lib/utils";

const ADMIN_EMAIL = "uylusjohnson@gmail.com";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, loading: authLoading, logout } = useAuth();
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        if (!authLoading) {
            if (!user || user.email !== ADMIN_EMAIL) {
                router.push("/");
            } else {
                setIsAuthorized(true);
            }
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
        <div className="flex-1 w-full bg-black">
            {/* Main Content */}
            <main className="w-full p-4 md:p-8">
                <div className="max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
