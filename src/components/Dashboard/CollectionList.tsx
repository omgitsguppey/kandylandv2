"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button, buttonVariants } from "@/components/ui/Button";
import { buildDashboardCollectionState } from "@/lib/drop-dashboard";
import type { Drop, UserProfile } from "@/types/db";
import { OwnedDropGalleryCard } from "./OwnedDropGalleryCard";
import { trackEvent } from "@/lib/telemetry";

interface CollectionListProps {
  drops: Drop[];
  userProfile: UserProfile | null;
  currentTimeMs?: number;
}

export function CollectionList({ drops, userProfile, currentTimeMs }: CollectionListProps) {
  const [filter, setFilter] = useState<"all" | "owned" | "locked">("all");
  const router = useRouter();
  const { ownedIds, visibleDrops, ownedDrops, lockedDrops, ownedCount, lockedCount } = useMemo(() => {
    const rawUnlocked = userProfile?.unlockedContent;
    const unlockedList = Array.isArray(rawUnlocked) ? rawUnlocked : [];
    const ids = new Set(unlockedList);
    const { visibleDrops: visible, ownedDrops: ownedVisible, lockedDrops: lockedVisible, ownedCount: owned, lockedCount: locked } = buildDashboardCollectionState(drops, ids, currentTimeMs);
    return { ownedIds: ids, visibleDrops: visible, ownedDrops: ownedVisible, lockedDrops: lockedVisible, ownedCount: owned, lockedCount: locked };
  }, [currentTimeMs, drops, userProfile?.unlockedContent]);
  const filteredDrops = filter === "owned" ? ownedDrops : filter === "locked" ? lockedDrops : visibleDrops;

  return (
    <section className="@container/member-collection min-w-0 space-y-5" data-mobile-residual-cleanup="score-impact" aria-labelledby="member-collection-title">
      <header className="min-w-0 space-y-4">
        <div className="space-y-2">
          <h2 id="member-collection-title" className="text-xl font-semibold tracking-tight text-foreground">My KandyDrops</h2>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm leading-relaxed text-muted-foreground">
            <span><strong className="font-semibold text-foreground">{ownedCount}</strong> unwrapped</span>
            <span><strong className="font-semibold text-foreground">{lockedCount}</strong> waiting</span>
            <span><strong className="font-semibold text-foreground">{visibleDrops.length}</strong> available</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter drops by ownership">
          {(["all", "owned", "locked"] as const).map((option) => (
            <Button key={option} size="sm" variant={filter === option ? "brand" : "ghost"} className="min-w-11 whitespace-normal capitalize" aria-pressed={filter === option} onClick={() => {
              setFilter(option);
              trackEvent("collection_filter_changed", { filter_value: option });
            }}>{option}</Button>
          ))}
        </div>
      </header>
      <div className="grid grid-cols-1 gap-x-4 gap-y-6 @lg/member-collection:grid-cols-2 @5xl/member-collection:grid-cols-3">
        {filteredDrops.map((drop) => {
          const unlocked = ownedIds.has(drop.id);
          return <OwnedDropGalleryCard key={drop.id} drop={drop} isUnlocked={unlocked} onOpen={() => {
            if (unlocked) {
              router.push(`/dashboard/viewer?id=${drop.id}`);
              return;
            }
            router.push("/drops");
          }} />;
        })}
        {filteredDrops.length === 0 ? (
          <div className="col-span-full space-y-3 py-6" data-mobile-residual-cleanup="score-impact">
            <h3 className="text-lg font-semibold text-foreground">No Drops to show</h3>
            <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">{filter === "owned" ? "You haven't unwrapped any Drops yet." : filter === "locked" ? "You've unwrapped every active Drop." : "No Drops are available right now."}</p>
            <a href="/drops" className={buttonVariants({ variant: "brand" })}>Browse Drops</a>
          </div>
        ) : null}
      </div>
    </section>
  );
}
