"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { SignedInLibraryCollectionWall } from "@/components/creative-tim/kandydrops/signed-in/SignedInLibraryCollectionWall";
import { OwnedDropGalleryCard } from "@/components/Dashboard/OwnedDropGalleryCard";
import { useAuth } from "@/context/AuthContext";
import { trackEvent } from "@/lib/telemetry";
import { getMobileModuleClassNames } from "@/lib/frontend-hardening/ui/mobile-scale-contract";
import { getMobileSkeletonClass } from "@/lib/frontend-hardening/ui/loading-state-contract";
import type { Drop } from "@/types/db";

const userLibraryModuleClassName = getMobileModuleClassNames("user", "list");
const userLibrarySkeletonClassName = getMobileSkeletonClass("user", "list");

interface LibraryClientProps {
  drops: Drop[];
}

export function LibraryClient({ drops }: LibraryClientProps) {
  const { userProfile, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const targetDropId = searchParams.get("drop")?.trim() || "";
  const unlockedIds = useMemo(() => {
    const source = userProfile?.unlockedContent;
    return Array.isArray(source) ? new Set(source) : new Set<string>();
  }, [userProfile?.unlockedContent]);

  const unlockedDrops = useMemo(() => drops.filter((drop) => unlockedIds.has(drop.id)), [drops, unlockedIds]);
  const router = useRouter();

  useEffect(() => {
    if (!userProfile) {
      return;
    }

    trackEvent("library_viewed");
  }, [userProfile]);

  useEffect(() => {
    if (authLoading || !targetDropId || !unlockedIds.has(targetDropId)) {
      return;
    }

    router.replace(`/dashboard/viewer?id=${encodeURIComponent(targetDropId)}`);
  }, [authLoading, router, targetDropId, unlockedIds]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [gridCols, setGridCols] = useState<2 | 3>(2);

  const filteredDrops = useMemo(() => {
    const filtered: Drop[] = [];
    const lowerSearch = searchQuery ? searchQuery.toLowerCase() : "";
    const filteringCategory = selectedCategory !== "All";

    for (const drop of unlockedDrops) {
      if (filteringCategory && drop.creatorId !== selectedCategory) {
        continue;
      }
      if (lowerSearch) {
        const titleMatches = drop.title.toLowerCase().includes(lowerSearch);
        const creatorMatches = Boolean(drop.creatorId?.toLowerCase().includes(lowerSearch));
        if (!titleMatches && !creatorMatches) {
          continue;
        }
      }
      filtered.push(drop);
    }

    return filtered;
  }, [unlockedDrops, searchQuery, selectedCategory]);

  const categories = useMemo(() => {
    const base = ["All"];
    const creators = new Set<string>();
    unlockedDrops.forEach((drop) => {
      if (drop.creatorId) {
        creators.add(drop.creatorId);
      }
    });
    return [...base, ...Array.from(creators).sort()];
  }, [unlockedDrops]);

  if (authLoading) {
    return (
      <div
        className="animate-pulse rounded-3xl border border-white/10 bg-slate-950/80 p-5 shadow-2xl shadow-black/20 md:p-7"
        data-mobile-density="compact"
        data-mobile-sprawl-guard="true"
        data-mobile-skeleton="user-library-route"
        data-mobile-organization="summary-first"
        data-mobile-drilldown="true"
        data-user-library-surface="my-kandydrops"
        data-user-library-loading-stable="true"
      >
        <div className="mb-6">
          <div className="mb-3 h-4 w-24 rounded bg-brand-purple/20" />
          <div className="mb-3 h-9 w-56 rounded-xl bg-white/10" />
          <div className="h-4 w-64 max-w-full rounded bg-white/5" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className={userLibrarySkeletonClassName} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative space-y-5 overflow-hidden px-2 pb-8 md:px-0 lg:space-y-6 lg:pb-10"
      data-mobile-density="compact"
      data-mobile-sprawl-guard="true"
      data-mobile-organization="summary-first"
      data-mobile-drilldown="true"
      data-user-library-surface="my-kandydrops"
    >
      <SignedInLibraryCollectionWall
        count={unlockedDrops.length}
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        searchQuery={searchQuery}
        onSearchChange={(query) => {
          if (query.length > 2) trackEvent("library_search", { query });
          setSearchQuery(query);
        }}
        gridCols={gridCols}
        onGridColsChange={setGridCols}
        hasDrops={unlockedDrops.length > 0}
        hasResults={filteredDrops.length > 0}
        emptyContent={(
          <div className={`${userLibraryModuleClassName} border-y border-white/10 py-10 text-center`} data-mobile-density="compact" data-mobile-sprawl-guard="true">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-brand-purple/30 bg-brand-purple/10 shadow-inner shadow-brand-purple/10">
              <Lock className="h-6 w-6 text-brand-purple md:h-8 md:w-8" />
            </div>
            <p className="mb-2 text-sm font-semibold text-brand-purple">Start your collection</p>
            <h2 className="mb-2 text-2xl font-semibold text-white">No unwrapped Drops yet</h2>
            <p className="mx-auto mb-6 max-w-md text-sm leading-6 text-slate-300">
              Browse available Drops to start building your collection.
            </p>
            <Link href="/drops">
              <Button variant="brand" className="min-h-11 rounded-xl px-5 py-2.5 text-sm font-semibold shadow-lg shadow-brand-purple/25">
                Browse Drops
              </Button>
            </Link>
          </div>
        )}
        noResultsContent={(
          <div className="border-y border-white/10 py-10 text-center" data-mobile-density="compact" data-mobile-sprawl-guard="true">
            <p className="text-sm text-slate-300">No Drops match that search or filter.</p>
          </div>
        )}
      >
        {filteredDrops.map((drop, index) => (
          <div
            key={drop.id}
            className={gridCols === 2 ? (index === 0 ? "sm:col-span-2 xl:col-span-12" : "xl:col-span-6") : (index < 2 ? "sm:col-span-2 xl:col-span-6" : "xl:col-span-4")}
          >
            <OwnedDropGalleryCard
              drop={drop}
              isUnlocked
              onOpen={() => {
                router.push(`/dashboard/viewer?id=${drop.id}`);
              }}
            />
          </div>
        ))}
      </SignedInLibraryCollectionWall>
    </div>
  );
}
