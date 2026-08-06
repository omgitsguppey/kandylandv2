"use client";

import { useAuth } from "@/context/AuthContext";
import { getPreferredAuthenticatedPathForProfile } from "@/lib/creator-application";
import { Ban, LogOut } from "lucide-react";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function BannedPage() {
    const { userProfile, logout, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && (!userProfile || (userProfile.status !== 'banned' && userProfile.status !== 'suspended'))) {
            const nextPath = userProfile
                ? getPreferredAuthenticatedPathForProfile(userProfile, userProfile.uid)
                : "/";
            router.replace(nextPath);
        }
    }, [userProfile, loading, router]);

    if (loading) return null;

    return (
        <div className="relative z-50 flex min-h-screen flex-col items-center justify-center overflow-hidden bg-black p-4 text-center">
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-brand-purple/15 to-transparent blur-3xl" />
            <div className="relative w-full max-w-md rounded-[2rem] border border-red-500/20 bg-black/55 p-6 shadow-2xl shadow-brand-purple/10 backdrop-blur-xl sm:p-8">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10 shadow-lg shadow-red-500/10">
                    <Ban className="h-10 w-10 text-red-500" />
                </div>

                <h1 className="mb-2 text-3xl font-black tracking-tight text-white">
                    Account {userProfile?.status === 'suspended' ? 'Suspended' : 'Banned'}
                </h1>

                <p className="mb-6 text-gray-400">
                    {userProfile?.status === 'suspended'
                        ? "Your account has been temporarily suspended."
                        : "Your account has been permanently banned from accessing KandyDrops."}
                </p>

                {userProfile?.statusReason && (
                    <div className="mb-8 rounded-2xl border border-white/10 bg-black/30 p-4 text-left">
                        <label className="mb-1 block text-xs font-bold uppercase text-gray-500">Reason</label>
                        <p className="text-sm text-white">{userProfile.statusReason}</p>
                    </div>
                )}

                <button
                    onClick={() => {
                        void logout();
                    }}
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-black transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                >
                    <LogOut className="w-5 h-5" />
                    Sign Out
                </button>
            </div>

            <p className="fixed bottom-8 text-xs text-gray-600">
                KandyDrops Enforcement System
            </p>
        </div>
    );
}
