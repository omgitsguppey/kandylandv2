"use client";

import { useAuth } from "@/context/AuthContext";
import { getPreferredAuthenticatedPathForProfile } from "@/lib/creator-application";
import { Ban, LogOut } from "lucide-react";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { KandyStateSurface } from "@/components/creative-tim/kandydrops/states/KandyStateSurface";

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
        <KandyStateSurface
            tone="critical"
            eyebrow="Account access restricted"
            title={`Account ${userProfile?.status === 'suspended' ? 'Suspended' : 'Banned'}`}
            description={userProfile?.status === 'suspended'
                ? "Your account has been temporarily suspended."
                : "Your account has been permanently banned from accessing KandyDrops."}
            icon={Ban}
            footer="KandyDrops Enforcement System"
        >
                {userProfile?.statusReason && (
                    <div className="mb-4 rounded-2xl border border-red-300/15 bg-black/25 p-4 text-left">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-red-200/75">Reason</p>
                        <p className="mt-2 text-sm leading-6 text-white">{userProfile.statusReason}</p>
                    </div>
                )}

                <button
                    type="button"
                    onClick={() => {
                        void logout();
                    }}
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white px-5 py-3 text-sm font-bold text-black transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#08040f]"
                >
                    <LogOut className="w-5 h-5" />
                    Sign Out
                </button>
        </KandyStateSurface>
    );
}
