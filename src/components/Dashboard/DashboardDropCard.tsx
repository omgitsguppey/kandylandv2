"use client";

import { Drop } from "@/types/db";
import NextImage from "next/image";
import { formatDistanceToNow } from "date-fns";
import { Lock, Unlock, Download, Share2, Eye, Clock } from "lucide-react";


import { memo } from "react";
import { toast } from "sonner";
import Link from "next/link";

interface DashboardDropCardProps {
    drop: Drop;
    isUnlocked: boolean;
    onClick?: () => void;
}

function DashboardDropCardBase({ drop, isUnlocked, onClick }: DashboardDropCardProps) {
    const handleShare = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(`${window.location.origin}/#drop-${drop.id}`);
        toast.success("Link copied to clipboard");
    };

    return (
        <div
            className="group relative bg-white/5 border border-white/5 rounded-2xl overflow-hidden transition-colors"
            onClick={onClick}
        >
            {/* Top: Thumbnail & Status */}
            <div className="relative w-full aspect-[21/9] bg-black/40 overflow-hidden border-b border-white/5">
                {drop.imageUrl ? (
                    <NextImage
                        src={drop.imageUrl}
                        alt={drop.title}
                        fill
                        className="object-cover opacity-80 transition-opacity"
                        sizes="(max-width: 768px) 100vw, 33vw"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-3xl">🍬</div>
                )}

                {/* Status Badge */}
                <div className="absolute top-2 right-2">
                    {isUnlocked ? (
                        <div className="bg-brand-green/90 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] font-bold text-white flex items-center gap-1 shadow-sm border border-brand-green/20">
                            <Unlock className="w-3 h-3" /> Owned
                        </div>
                    ) : (
                        <div className="bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] font-bold text-gray-400 flex items-center gap-1 shadow-sm border border-white/10">
                            <Lock className="w-3 h-3" /> Locked
                        </div>
                    )}
                </div>
            </div>

            {/* Middle: Content Info */}
            <div className="p-4">
                <div className="flex items-start justify-between mb-1">
                    <h3 className="font-bold text-white text-base leading-tight pr-2">{drop.title}</h3>
                    <span className="text-[10px] font-mono text-gray-500 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                        #{drop.id.slice(0, 4)}
                    </span>
                </div>

                <p className="text-xs text-gray-400 line-clamp-2 mb-3 min-h-[2.5em]">
                    {drop.description}
                </p>

                {/* Metadata Row */}
                <div className="flex items-center gap-3 text-[10px] text-gray-500 font-medium mb-4">
                    <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-md">
                        <Clock className="w-3 h-3" />
                        {drop.createdAt ? formatDistanceToNow(drop.createdAt, { addSuffix: true }) : 'Unknown'}
                    </div>
                </div>

                {/* Bottom: Action Row */}
                <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                    {isUnlocked ? (
                        <>
                            <Link
                                href={`/dashboard/viewer?id=${drop.id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-brand-cyan/10 text-brand-cyan text-xs font-bold transition-colors border border-brand-cyan/20"
                            >
                                <Eye className="w-3.5 h-3.5" /> View
                            </Link>
                            <Link
                                href={`/dashboard/viewer?id=${drop.id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white/5 text-gray-300 text-xs font-bold transition-colors border border-white/5"
                            >
                                <Download className="w-3.5 h-3.5" /> Save
                            </Link>
                        </>
                    ) : (
                        <div className="w-full flex items-center justify-between text-xs">
                            <span className="text-brand-purple font-bold">{drop.unlockCost} Drops</span>
                            <span className="text-gray-500">To Unlock</span>
                        </div>
                    )}
                    <button
                        onClick={handleShare}
                        className="p-2 rounded-lg text-gray-400 transition-colors"
                        title="Share"
                    >
                        <Share2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </div>
    );
}

export const DashboardDropCard = memo(DashboardDropCardBase);

