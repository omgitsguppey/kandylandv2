"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { collection, query, where, getDocs, doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserProfile, Drop } from "@/types/db";
import { DropGrid } from "@/components/DropGrid";
import { useAuth } from "@/context/AuthContext";
import { Loader2, MapPin, Link as LinkIcon, Twitter, Instagram, Globe, UserPlus, UserCheck, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function CreatorProfilePage() {
    const params = useParams();
    const { user: currentUser, userProfile: currentUserProfile } = useAuth();
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
                // 1. Fetch Creator Profile
                const usersRef = collection(db, "users");
                const q = query(usersRef, where("username", "==", username));
                const querySnapshot = await getDocs(q);

                if (querySnapshot.empty) {
                    setLoading(false);
                    return;
                }

                const creatorData = querySnapshot.docs[0].data() as UserProfile;
                setCreator(creatorData);

                // 2. Fetch Creator's Drops
                const dropsRef = collection(db, "drops");
                // Find drops where creatorId matches OR (legacy/fallback if we don't have backfilled data yet)
                // For now, let's assume we rely on creatorId. If data is sparse, we might need a migration script.
                const dropsQuery = query(
                    dropsRef,
                    where("creatorId", "==", creatorData.uid),
                    where("status", "==", "active")
                );
                const dropsSnap = await getDocs(dropsQuery);
                const dropsList = dropsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Drop));

                // Sort by validFrom desc in memory (firestore needs composite index for complex queries otherwise)
                dropsList.sort((a, b) => b.validFrom - a.validFrom);

                setDrops(dropsList);

            } catch (error) {
                console.error("Error fetching creator:", error);
                toast.error("Failed to load profile.");
            } finally {
                setLoading(false);
            }
        }

        fetchData();
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
        const userRef = doc(db, "users", currentUser.uid);

        try {
            if (following) {
                await updateDoc(userRef, {
                    following: arrayRemove(creator.uid)
                });
                setFollowing(false);
                toast.success(`Unfollowed ${creator.displayName}`);
            } else {
                await updateDoc(userRef, {
                    following: arrayUnion(creator.uid)
                });
                setFollowing(true);
                toast.success(`Following ${creator.displayName}!`);
            }
        } catch (error) {
            console.error("Follow error:", error);
            toast.error("Action failed.");
        } finally {
            setFollowLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-brand-pink" />
            </div>
        );
    }

    if (!creator) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8">
                <div className="text-6xl mb-4">👻</div>
                <h1 className="text-2xl font-bold text-white mb-2">Creator Not Found</h1>
                <p className="text-gray-400">The user @{username} does not exist or has been removed.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-20">
            {/* Banner */}
            <div className="h-48 md:h-64 bg-zinc-800 relative overflow-hidden group">
                {creator.bannerUrl ? (
                    <img src={creator.bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-gradient-to-r from-brand-pink/20 to-brand-purple/20" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
            </div>

            <div className="container mx-auto px-4 -mt-20 relative z-10">
                <div className="flex flex-col md:flex-row items-end md:items-end gap-6 mb-8">
                    {/* Avatar */}
                    <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-black bg-zinc-800 overflow-hidden shrink-0 shadow-2xl">
                        {creator.photoURL ? (
                            <img src={creator.photoURL} alt={creator.displayName || ""} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-4xl">👤</div>
                        )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 pb-2">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h1 className="text-3xl font-bold text-white">{creator.displayName}</h1>
                            {creator.isVerified && (
                                <CheckCircle2 className="w-5 h-5 text-brand-cyan shrink-0" />
                            )}
                        </div>
                        <p className="text-brand-pink font-medium mb-3">@{creator.username}</p>

                        {creator.bio && (
                            <p className="text-gray-300 max-w-2xl text-sm md:text-base leading-relaxed mb-4">{creator.bio}</p>
                        )}

                        {/* Socials */}
                        {creator.socialLinks && (
                            <div className="flex gap-4">
                                {creator.socialLinks.twitter && (
                                    <a href={creator.socialLinks.twitter} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-white transition-colors">
                                        <Twitter className="w-5 h-5" />
                                    </a>
                                )}
                                {creator.socialLinks.instagram && (
                                    <a href={creator.socialLinks.instagram} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-white transition-colors">
                                        <Instagram className="w-5 h-5" />
                                    </a>
                                )}
                                {creator.socialLinks.website && (
                                    <a href={creator.socialLinks.website} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-white transition-colors">
                                        <Globe className="w-5 h-5" />
                                    </a>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="mb-4 md:mb-6 shrink-0 w-full md:w-auto">
                        <button
                            onClick={handleFollow}
                            disabled={followLoading}
                            className={`w-full md:w-auto px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${following
                                    ? "bg-white/10 text-white hover:bg-white/20"
                                    : "bg-brand-pink text-white hover:bg-brand-pink/80 shadow-lg shadow-brand-pink/20"
                                }`}
                        >
                            {followLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : following ? (
                                <>
                                    <UserCheck className="w-5 h-5" /> Following
                                </>
                            ) : (
                                <>
                                    <UserPlus className="w-5 h-5" /> Follow
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Content Grid */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-white/10 pb-4">
                        <h2 className="text-xl font-bold text-white">Latest Drops</h2>
                        <span className="text-sm text-gray-500">{drops.length} items</span>
                    </div>

                    {drops.length > 0 ? (
                        <DropGrid drops={drops} />
                    ) : (
                        <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/5 border-dashed">
                            <p className="text-gray-400">This creator hasn't dropped anything yet.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
