"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Lock, ShieldCheck } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { Drop } from "@/types/db";
import { useViewerTelemetry } from "./adapters/ViewerTelemetryAdapter";
import { useViewerState } from "./hooks/useViewerState";
import { useViewerSecurity } from "./hooks/useViewerSecurity";
import { useViewerFeedback } from "./hooks/useViewerFeedback";

import { ViewerSkeleton } from "./components/ViewerSkeleton";
import { MediaViewer } from "./components/MediaViewer";
import { ThumbnailsSlider } from "./components/ThumbnailsSlider";
import { DropInfoOverlay } from "./components/DropInfoOverlay";

interface ViewerClientProps {
    drop: Drop | null;
    initialCreatorProfile?: {
        uid: string;
        displayName: string;
        username: string;
        photoURL: string | null;
        isVerified: boolean;
    } | null;
}

export function ViewerClient({ drop, initialCreatorProfile }: ViewerClientProps) {
    const { user, userProfile, loading: authLoading } = useAuth();
    const router = useRouter();

    const [isAuthorized, setIsAuthorized] = useState(false);
    useEffect(() => {
        if (!drop || !user) {
            setIsAuthorized(false);
            return;
        }
        const isCreator = user.uid === drop.creatorId;
        const hasUnlocked = userProfile?.unlockedContentTimestamps?.[drop.id] !== undefined;
        setIsAuthorized(isCreator || hasUnlocked);
    }, [user, userProfile, drop]);

    // 2. Telemetry mounting happens internally within useViewerTelemetry

    // 3. State Hooks
    const {
        activeIndex,
        setActiveIndex,
        assetCount,
        contentBlobUrl,
        resolvedContent,
        contentLoading,
        thumbnailItems,
    } = useViewerState({
        drop,
        isAuthorized,
        trackContentLoaded: (ms, cached, kind) => telemetry.trackContentLoaded(ms, cached, kind)
    });

    // 2. Telemetry mounting
    const telemetry = useViewerTelemetry({
        drop,
        isAuthorized,
        assetCount,
        activeIndex,
        resolvedContent,
        contentLoading,
        contentBlobUrl,
    });

    // 4. Security Hook
    const {
        isSecurityTriggered,
        securityWarning,
        preventContextMenu,
    } = useViewerSecurity({
        drop,
        isAuthorized,
        activeIndex,
        contentKind: resolvedContent.kind,
    });

    // 5. Feedback Hook
    const {
        following,
        submittingFollow,
        feedbackComplete,
        submittingFeedback,
        feedbackValue,
        retentionDrops,
        handleFollow,
        handleFeedback,
    } = useViewerFeedback({
        drop,
        isAuthorized,
        initialCreatorProfile,
    });

    // Asset switching side-effects
    useEffect(() => {
        if (!isAuthorized || !drop) return;
        telemetry.handleAssetSwitch(activeIndex, resolvedContent.kind);
    }, [activeIndex, isAuthorized, drop, telemetry, resolvedContent.kind]);

    // Early Returns
    if (authLoading || (user && !userProfile) || contentLoading && !contentBlobUrl) {
        return <ViewerSkeleton />;
    }

    if (!user) {
        return (
            <div className="max-w-4xl mx-auto pt-20 px-4 text-center">
                <Lock className="w-12 h-12 text-white/50 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-white mb-2">Sign in Required</h1>
                <p className="text-gray-400 mb-6">You must be signed in to view this content.</p>
                <Link href="/auth" className="px-6 py-3 bg-white text-black font-bold rounded-full">Sign In</Link>
            </div>
        );
    }

    if (!drop || !isAuthorized) {
        return (
            <div className="max-w-4xl mx-auto pt-20 px-4 text-center">
                <ShieldCheck className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-white mb-2">Not Authorized</h1>
                <p className="text-gray-400 mb-6">You do not have access to this drop.</p>
                <button onClick={() => router.push("/drops")} className="px-6 py-3 bg-white/10 text-white font-bold rounded-full hover:bg-white/20">Go Back</button>
            </div>
        );
    }

    const viewerStageHeight = resolvedContent.kind === "audio" ? "h-[300px] md:h-[400px]" : "h-[65vh] md:h-[75vh]";
    const hasThumbnailRail = assetCount > 1;

    return (
        <div className="min-h-screen bg-[#0a0a0a] pb-24 font-sans selection:bg-brand-purple/30 selection:text-white">
            <section className="bg-black border-b border-white/5 relative z-10 sticky top-0 md:top-auto">
                <div className="flex items-center justify-between px-4 py-3 md:py-4">
                    <Link
                        href="/dashboard/library"
                        onClick={() => telemetry.flushSessionTelemetry()}
                        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors py-2 group"
                    >
                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/5 group-hover:bg-white/10 group-hover:border-white/20 transition-all">
                            <ArrowLeft className="w-4 h-4" />
                        </div>
                        <span className="font-medium hidden sm:inline">Back to Library</span>
                        <span className="font-medium sm:hidden">Back</span>
                    </Link>
                </div>

                <div className={`w-full ${viewerStageHeight} bg-[#050505] relative overflow-hidden transition-all duration-500`}>
                    {/* Security Warning Mode */}
                    {isSecurityTriggered && securityWarning && (
                        <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-200">
                            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 animate-pulse">
                                <ShieldCheck className="w-10 h-10 text-red-500" />
                            </div>
                            <h2 className="text-2xl font-black text-white mb-3 uppercase tracking-wider">{securityWarning.label}</h2>
                            <p className="text-gray-400 max-w-sm mb-8 text-sm md:text-base leading-relaxed">{securityWarning.message}</p>
                            <div className="px-5 py-2.5 bg-white/5 border border-white/10 rounded-full text-xs font-mono text-gray-500 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                                Monitoring active session
                            </div>
                        </div>
                    )}

                    <div className={`absolute inset-0 z-10 transition-opacity duration-300 ${isSecurityTriggered ? 'opacity-0 select-none pointer-events-none blur-xl' : 'opacity-100'}`}>
                        <MediaViewer
                            drop={drop}
                            contentBlobUrl={contentBlobUrl}
                            resolvedContent={resolvedContent}
                            contentLoading={contentLoading}
                            preventContextMenu={preventContextMenu}
                            reportWatchMediaPlay={() => telemetry.reportWatchMediaPlay()}
                            reportWatchMediaPause={(t, d) => telemetry.reportWatchMediaPause(t, d)}
                            reportWatchMediaSeeking={(s, e, d) => telemetry.reportWatchMediaSeeking(s, e, d)}
                            reportWatchMediaWaiting={(s) => telemetry.reportWatchMediaWaiting(s)}
                            reportWatchPlaybackState={(r, m) => telemetry.reportWatchPlaybackState(r, m)}
                            handleMediaTimeUpdate={(c, d) => telemetry.handleMediaTimeUpdate(c, d)}
                            trackAssetCompleted={(c, d) => telemetry.trackAssetCompleted(c, d)}
                            reportWatchMediaEnded={(t, d) => telemetry.reportWatchMediaEnded(t, d)}
                        />
                    </div>
                </div>

                {hasThumbnailRail && (
                    <ThumbnailsSlider
                        assetCount={assetCount}
                        activeIndex={activeIndex}
                        thumbnailItems={thumbnailItems}
                        setActiveIndex={setActiveIndex}
                    />
                )}
            </section>

            <DropInfoOverlay
                drop={drop}
                user={user}
                userProfile={userProfile}
                contentBlobUrl={contentBlobUrl}
                activeIndex={activeIndex}
                initialCreatorProfile={initialCreatorProfile}
                following={following}
                submittingFollow={submittingFollow}
                handleFollow={handleFollow}
                feedbackComplete={feedbackComplete}
                submittingFeedback={submittingFeedback}
                feedbackValue={feedbackValue}
                handleFeedback={handleFeedback}
                retentionDrops={retentionDrops}
                handleRelatedDropClick={(d, t) => telemetry.handleRelatedDropClick(d, t)}
                recordDownload={() => telemetry.recordDownload(activeIndex)}
            />
        </div>
    );
}
