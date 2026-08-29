import { useMemo } from "react";
import Link from "next/link";
import NextImage from "next/image";
import { CheckCircle2, Download, Eye, Loader2, ShoppingBag, ThumbsDown, ThumbsUp } from "lucide-react";

import { Card, CardContent } from "@/components/creative-tim/ui/card";
import { ViewerDetailCanvas } from "@/components/creative-tim/kandydrops/viewer/ViewerDetailCanvas";
import { getImageLoadingPolicy, getImagePolicyDataAttributes } from "@/lib/image-loading-policy";
import { cn } from "@/lib/utils";
import type { Drop } from "@/types/db";

import { formatUnwrappedLabel, sanitizeDropTags } from "../ViewerHelpers";

interface DropInfoOverlayProps {
  drop: Drop;
  user: any;
  userProfile: any;
  contentBlobUrl: string | null;
  activeIndex: number;
  initialCreatorProfile?: { uid: string; displayName: string; username: string; photoURL: string | null; isVerified: boolean; } | null;
  following: boolean;
  submittingFollow: boolean;
  handleFollow: () => void;
  feedbackComplete: boolean;
  submittingFeedback: boolean;
  feedbackValue: boolean | null;
  handleFeedback: (val: boolean) => void;
  retentionDrops: Drop[];
  handleRelatedDropClick: (destination: string, type: string) => void;
  recordDownload: () => void;
}

export function DropInfoOverlay({
  drop,
  user,
  userProfile,
  contentBlobUrl,
  activeIndex,
  initialCreatorProfile,
  following,
  submittingFollow,
  handleFollow,
  feedbackComplete,
  submittingFeedback,
  feedbackValue,
  handleFeedback,
  retentionDrops,
  handleRelatedDropClick,
  recordDownload,
}: DropInfoOverlayProps) {
  const unwrappedAt = useMemo(() => {
    if (!userProfile?.unlockedContentTimestamps) return null;
    const raw = userProfile.unlockedContentTimestamps[drop.id];
    return Number.isFinite(raw) ? Math.floor(raw) : null;
  }, [drop.id, userProfile?.unlockedContentTimestamps]);

  const previewTags = useMemo(() => sanitizeDropTags(drop.tags), [drop.tags]);
  const totalUnlocks = useMemo(
    () => (Number.isFinite(drop.totalUnlocks) ? Math.max(0, Math.floor(drop.totalUnlocks)) : 0),
    [drop.totalUnlocks],
  );
  const retentionImagePolicy = getImageLoadingPolicy("dashboard_collection");

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <ViewerDetailCanvas
        actions={(
          <>
            {user.uid === drop.creatorId && contentBlobUrl ? (
              <a
                href={contentBlobUrl}
                download={drop.title}
                onClick={recordDownload}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple/75 sm:flex-none"
              >
                <Download className="h-4 w-4" />
                Download Source
              </a>
            ) : null}
            <Link
              href="/drops"
              onClick={() => handleRelatedDropClick("/drops", "browse_more")}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-brand-purple px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-purple/25 transition hover:bg-fuchsia-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:flex-none"
            >
              <ShoppingBag className="h-4 w-4" />
              Browse Drops
            </Link>
          </>
        )}
      >
        <div>
            {initialCreatorProfile ? (
              <div className="mb-6 flex items-center gap-3">
                <NextImage
                  src={initialCreatorProfile.photoURL || "/avatars/default.png"}
                  alt={initialCreatorProfile.displayName}
                  width={44}
                  height={44}
                  unoptimized
                  className="h-11 w-11 rounded-2xl border border-brand-purple/30 bg-brand-purple/10 object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h2 className="truncate text-sm font-semibold text-white">{initialCreatorProfile.displayName}</h2>
                    {initialCreatorProfile.isVerified ? <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-purple" aria-label="Verified Creator" /> : null}
                  </div>
                  {initialCreatorProfile.username ? <p className="truncate text-sm text-slate-400">@{initialCreatorProfile.username}</p> : null}
                </div>
                <button
                  type="button"
                  onClick={handleFollow}
                  disabled={submittingFollow}
                  className={cn(
                    "inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple/75 disabled:cursor-not-allowed disabled:opacity-60",
                    following ? "border border-white/15 bg-white/5 text-white hover:bg-white/10" : "bg-brand-purple text-white shadow-lg shadow-brand-purple/25 hover:bg-fuchsia-600",
                  )}
                >
                  {submittingFollow ? <Loader2 className="h-4 w-4 animate-spin" /> : following ? "Following" : "Follow"}
                </button>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-400">
              <span>{formatUnwrappedLabel(unwrappedAt)}</span>
              <span className="inline-flex items-center gap-1.5">
                <Eye className="h-4 w-4 text-brand-purple" aria-hidden="true" />
                {totalUnlocks.toLocaleString()} unwrapped
              </span>
              {previewTags.map((tag) => <span key={tag} className="font-medium text-fuchsia-200">{tag}</span>)}
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{drop.title}</h1>
            {drop.description ? <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">{drop.description}</p> : null}
        </div>
      </ViewerDetailCanvas>

      {user.uid !== drop.creatorId ? (
        <Card className="relative overflow-hidden rounded-3xl border-brand-purple/20 bg-slate-950/80 py-0 text-white shadow-xl shadow-black/15">
          <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-brand-purple/20 blur-3xl" aria-hidden="true" />
          <CardContent className="relative flex flex-col items-center justify-between gap-5 px-5 py-6 text-center sm:flex-row sm:px-7 sm:text-left">
            <div>
              <h2 className="text-xl font-semibold text-white">Did you enjoy this KandyDrop?</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">Share feedback to earn 10 GumDrops.</p>
            </div>
            <div className="flex w-full gap-3 sm:w-auto">
              {feedbackComplete ? (
                <div className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-purple/15 px-5 text-sm font-semibold text-fuchsia-200 sm:w-auto">
                  <CheckCircle2 className="h-4 w-4" />
                  Reward claimed
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => handleFeedback(true)}
                    disabled={submittingFeedback}
                    className={cn(
                      "inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple/75 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none",
                      feedbackValue === true ? "bg-brand-purple text-white shadow-lg shadow-brand-purple/25" : "border border-white/15 bg-white/5 text-white hover:bg-white/10",
                    )}
                  >
                    <ThumbsUp className="h-4 w-4" />
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFeedback(false)}
                    disabled={submittingFeedback}
                    className={cn(
                      "inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple/75 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none",
                      feedbackValue === false ? "bg-white text-slate-950" : "border border-white/15 bg-white/5 text-white hover:bg-white/10",
                    )}
                  >
                    <ThumbsDown className="h-4 w-4" />
                    No
                  </button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {retentionDrops.length > 0 ? (
        <section className="pt-2">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-brand-purple">Keep exploring</p>
              <h2 className="mt-1 text-2xl font-semibold text-white">Continue unwrapping</h2>
            </div>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-3">
            {retentionDrops.map((retentionDrop) => (
              <Link
                key={retentionDrop.id}
                href={`/dashboard/viewer?id=${retentionDrop.id}`}
                onClick={() => handleRelatedDropClick(retentionDrop.id, "library_related")}
                className="group w-44 shrink-0 rounded-2xl border border-white/10 bg-slate-950/70 p-2 shadow-lg shadow-black/10 transition hover:-translate-y-1 hover:border-brand-purple/50 sm:w-52"
              >
                <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-slate-900">
                  {retentionDrop.imageUrl ? (
                    <NextImage
                      src={retentionDrop.imageUrl}
                      alt={retentionDrop.title}
                      fill
                      loading={retentionImagePolicy.loading}
                      preload={retentionImagePolicy.preload}
                      fetchPriority={retentionImagePolicy.fetchPriority}
                      quality={retentionImagePolicy.quality}
                      sizes={retentionImagePolicy.sizes}
                      className="object-cover transition duration-500 group-hover:scale-105"
                      {...getImagePolicyDataAttributes(retentionImagePolicy)}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-brand-purple/10 text-2xl text-brand-purple">K</div>
                  )}
                </div>
                <p className="mt-3 truncate text-sm font-semibold text-white group-hover:text-fuchsia-200">{retentionDrop.title}</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-400"><Eye className="h-3.5 w-3.5 text-brand-purple" />{(retentionDrop.totalUnlocks || 0).toLocaleString()} unwrapped</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
