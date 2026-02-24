"use client";

import { useAuth } from "@/context/AuthContext";
import { Play, Lock } from "lucide-react";

import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { Drop } from "@/types/db";
import NextImage from "next/image";

interface LibraryClientProps {
    drops: Drop[];
}

export function LibraryClient({ drops }: LibraryClientProps) {
    const { userProfile, loading: authLoading } = useAuth();

    // Skeleton loading state
    if (authLoading) {
        return (
            <div className="animate-pulse">
                <div className="mb-8">
                    <div className="h-10 w-64 bg-white/10 rounded mb-2" />
                    <div className="h-5 w-96 bg-white/5 rounded" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="aspect-video bg-white/5 rounded-2xl" />
                    ))}
                </div>
            </div>
        );
    }

    // Filter drops to only those unlocked by the user
    // Provide explicit fallback for undefined userProfile/unlockedContent to avoid crash
    const unlockedDrops = drops.filter(drop => userProfile?.unlockedContent?.includes(drop.id));

    return (
        <div>
            <header className="mb-8">
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-pink to-brand-cyan mb-2">
                    My KandyDrops
                </h1>
                <p className="text-gray-400">Your collection of unlocked exclusive content.</p>
            </header>

            {unlockedDrops.length === 0 ? (
                <div className="glass-panel p-12 rounded-3xl text-center border border-white/5">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Lock className="w-8 h-8 text-gray-500" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">No Content Yet</h2>
                    <p className="text-gray-400 mb-8 max-w-md mx-auto">
                        You haven't unlocked any drops yet. Visit the home page to start your collection.
                    </p>
                    <Link href="/">
                        <Button variant="brand" className="px-8 py-3 rounded-full text-lg shadow-[0_0_20px_rgba(236,72,153,0.3)] _0_30px_rgba(236,72,153,0.5)]">
                            Browse Drops
                        </Button>
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {unlockedDrops.map((drop) => (
                        <div
                            key={drop.id}
                        >
                            <Link href={`/dashboard/viewer?id=${drop.id}`} className="block group">
                                <div className="relative aspect-video rounded-2xl overflow-hidden mb-4 border border-white/10 transition-colors">
                                    {/* Thumbnail */}
                                    {drop.imageUrl ? (
                                        <NextImage
                                            src={drop.imageUrl}
                                            alt={drop.title}
                                            fill
                                            className="object-cover transition-transform duration-500"
                                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                                            <span className="text-4xl">🍬</span>
                                        </div>
                                    )}

                                    {/* Play Overlay */}
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 transition-opacity backdrop-blur-sm">
                                        <div className="w-12 h-12 rounded-full bg-brand-pink flex items-center justify-center shadow-lg shadow-brand-pink/20 scale-90 transition-transform">
                                            <Play className="w-5 h-5 text-white fill-current ml-0.5" />
                                        </div>
                                    </div>
                                </div>

                                <h3 className="text-lg font-bold text-white transition-colors line-clamp-1">{drop.title}</h3>
                                <p className="text-sm text-gray-400 line-clamp-1">{drop.description}</p>
                            </Link>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
