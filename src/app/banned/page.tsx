"use client";

import { useAuth } from "@/context/AuthContext";
import { Ban, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function BannedPage() {
    const { userProfile, logout, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && (!userProfile || (userProfile.status !== 'banned' && userProfile.status !== 'suspended'))) {
            // If not banned/suspended, go home
            router.push("/");
        }
    }, [userProfile, loading, router]);

    if (loading) return null;

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 text-center z-50 relative">
            <div className="glass-panel p-8 rounded-3xl max-w-md w-full border border-red-500/20 shadow-2xl shadow-red-500/10">
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
                    <Ban className="w-10 h-10 text-red-500" />
                </div>

                <h1 className="text-3xl font-bold text-white mb-2">
                    Account {userProfile?.status === 'suspended' ? 'Suspended' : 'Banned'}
                </h1>

                <p className="text-gray-400 mb-6">
                    {userProfile?.status === 'suspended'
                        ? "Your account has been temporarily suspended."
                        : "Your account has been permanently banned from accessing KandyDrops."}
                </p>

                {userProfile?.statusReason && (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-8 text-left">
                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Reason</label>
                        <p className="text-white text-sm">{userProfile.statusReason}</p>
                    </div>
                )}

                <button
                    onClick={() => logout().then(() => router.push("/"))}
                    className="w-full py-4 rounded-xl bg-white text-black font-bold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                >
                    <LogOut className="w-5 h-5" />
                    Sign Out
                </button>
            </div>

            <p className="fixed bottom-8 text-gray-600 text-xs">
                KandyDrops Enforcement System
            </p>
        </div>
    );
}
