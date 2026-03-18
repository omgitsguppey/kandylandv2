"use client";

import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Lock, UserCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { DropGrid } from "@/components/DropGrid";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { authFetch } from "@/lib/authFetch";
import { Drop, UserProfile } from "@/types/db";

export default function CreatorProfileClient() {
    const params = useParams();
    const { user: currentUser, userProfile: currentUserProfile, loading: authLoading } = useAuth();
    const { openAuthModal } = useUI();
    const username = params.username as string;

    const [creator, setCreator] = useState<UserProfile | null>(null);
    const [drops, setDrops] = useState<Drop[]>([]);
    const [loading, setLoading] = useState(true);
    const [following, setFollowing] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);

    useEffect(() => {
        if (!username) return;

        async function fetchData() {
            try {
                const response = await fetch(`/api/creators/${encodeURIComponent(username)}`, {
                    cache: "no-store",
                });
                const result = await response.json() as {
                    success?: boolean;
                    creator?: UserProfile;
                    drops?: Drop[];
                };

                if (!response.ok || !result.success || !result.creator) {
                    setLoading(false);
                    return;
                }

                setCreator(result.creator);
                setDrops(result.drops || []);
            } catch (error) {
                console.error("Error fetching creator:", error);
                toast.error("Failed to load profile.");
            } finally {
                setLoading(false);
            }
        }

        void fetchData();
    }, [username]);

    useEffect(() => {
        if (currentUserProfile && creator) {
            setFollowing(currentUserProfile.following?.includes(creator.uid) || false);
        }
    }, [currentUserProfile, creator]);

    const handleFollow = async () => {
        if (!currentUser || !creator) {
            toast.error("Please sign in to follow creators.");
            return;
        }
        if (currentUser.uid === creator.uid) {
            toast.error("You cannot follow yourself!");
            return;
        }

        setFollowLoading(true);

        try {
            const action = following ? "unfollow" : "follow";
            const response = await authFetch("/api/user/follow", {
                method: "POST",
                body: JSON.stringify({
                    targetUserId: creator.uid,
                    action,
                }),
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error);

            setFollowing(!following);
            toast.success(following ? `Unfollowed ${creator.displayName}` : `Following ${creator.displayName}!`);
        } catch (error: any) {
            console.error("Follow error:", error);
            toast.error(error.message || "Action failed.");
        } finally {
            setFollowLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-brand-purple" />
            </div>
        );
    }

    if (!creator) {
        return (
            <div className="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center">
                <div className="mb-4 text-6xl">👻</div>
                <h1 className="mb-2 text-2xl font-bold text-white">Creator Not Found</h1>
                <p className="text-gray-400">The user @{username} does not exist or has been removed.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-20">
            <div className="group relative h-48 overflow-hidden bg-zinc-800 md:h-64">
                {creator.bannerUrl ? (
                    <Image src={creator.bannerUrl} alt="Banner" fill priority className="object-cover" />
                ) : (
                    <div className="h-full w-full bg-gradient-to-r from-brand-purple/20 to-brand-purple/20" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
            </div>

            <div className="container relative z-10 mx-auto -mt-20 px-4">
                <div className="mb-8 flex flex-col items-end gap-6 md:flex-row md:items-end">
                    <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-full border-4 border-black bg-zinc-800 shadow-2xl md:h-40 md:w-40">
                        {creator.photoURL ? (
                            <Image src={creator.photoURL} alt={creator.displayName || ""} fill sizes="160px" priority className="object-cover" />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center text-4xl">👤</div>
                        )}
                    </div>

                    <div className="flex-1 pb-2">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                            <h1 className="text-3xl font-bold text-white">{creator.displayName}</h1>
                            {creator.isVerified && <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-purple" />}
                        </div>
                        <p className="mb-3 font-medium text-brand-purple">@{creator.username}</p>

                        {creator.bio && (
                            <p className="mb-4 max-w-2xl text-sm leading-relaxed text-gray-300 md:text-base">{creator.bio}</p>
                        )}
                    </div>

                    <div className="mb-4 w-full shrink-0 md:mb-6 md:w-auto">
                        <button
                            onClick={handleFollow}
                            disabled={followLoading}
                            className={`flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 font-bold transition-all md:w-auto ${following ? "bg-white/10 text-white" : "bg-brand-purple text-white shadow-lg shadow-brand-purple/20"}`}
                        >
                            {followLoading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : following ? (
                                <>
                                    <UserCheck className="h-5 w-5" /> Following
                                </>
                            ) : (
                                <>
                                    <UserPlus className="h-5 w-5" /> Follow
                                </>
                            )}
                        </button>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-white/10 pb-4">
                        <h2 className="text-xl font-bold text-white">Latest Drops</h2>
                        <span className="text-sm text-gray-500">{drops.length} items</span>
                    </div>

                    {drops.length > 0 ? (
                        <div className="relative">
                            {!authLoading && !currentUser && (
                                <div className="glass-panel absolute inset-0 z-50 m-2 flex items-center justify-center border border-white/5 !bg-black/60 pt-10 pb-20 backdrop-blur-md">
                                    <div className="animate-in fade-in zoom-in flex max-w-md flex-col items-center p-8 text-center duration-500">
                                        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-brand-purple/30 bg-brand-purple/20 shadow-[0_0_30px_rgba(236,72,153,0.3)]">
                                            <Lock className="h-10 w-10 text-brand-purple" />
                                        </div>
                                        <h3 className="mb-4 text-3xl font-black tracking-tight text-white">Members Only</h3>
                                        <p className="mb-8 font-medium leading-relaxed text-gray-400">
                                            Sign in to preview and unwrap this creator&apos;s exclusive drops.
                                        </p>
                                        <button
                                            onClick={() => openAuthModal("signup")}
                                            className="w-full rounded-xl bg-brand-purple px-8 py-4 text-lg font-black text-white shadow-[0_0_40px_rgba(217,70,239,0.2)] transition-transform hover:scale-105 active:scale-95"
                                        >
                                            Sign Up / Sign In
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className={!authLoading && !currentUser ? "pointer-events-none select-none grayscale opacity-30 transition-all duration-700" : ""}>
                                <DropGrid drops={drops} onSelectDrop={() => {}} />
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-3xl border border-white/5 border-dashed bg-white/5 py-20 text-center">
                            <p className="text-gray-400">This creator hasn&apos;t dropped anything yet.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
