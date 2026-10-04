"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/Button";
import { Card } from "@/components/creative-tim/ui/card";
import { usePageViewEvent } from "@/components/Analytics/PageViewEvent";
import { SignedInLibraryCollectionWall } from "@/components/creative-tim/kandydrops/signed-in/SignedInLibraryCollectionWall";
import { OwnedDropGalleryCard } from "@/components/Dashboard/OwnedDropGalleryCard";
import { useAuth } from "@/context/AuthContext";
import { trackEvent } from "@/lib/telemetry";
import type { Drop } from "@/types/db";

interface LibraryClientProps {
  drops: Drop[];
}

const defaultBrowsing = { searchQuery: "", selectedCategory: "All", gridCols: 2 as 2 | 3 };

export function LibraryClient({ drops }: LibraryClientProps) {
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetDropId = searchParams.get("drop")?.trim() || "";
  const profileReady = Boolean(!authLoading && user && userProfile?.uid === user.uid);
  const ownershipKnown = profileReady && Array.isArray(userProfile?.unlockedContent);
  const ownerStamp = useMemo(() => ({ uid: user?.uid ?? null }), [user?.uid]);
  const unlockedIds = useMemo(() => {
    const source = userProfile?.unlockedContent;
    return ownershipKnown && Array.isArray(source) ? new Set(source) : new Set<string>();
  }, [ownershipKnown, userProfile?.unlockedContent]);
  const unlockedDrops = useMemo(() => drops.filter((drop) => unlockedIds.has(drop.id)), [drops, unlockedIds]);
  const currentOwner = useRef<{ stamp: typeof ownerStamp; ids: Set<string> } | null>(null);
  const targetHandoff = useRef<{ stamp: typeof ownerStamp; id: string } | null>(null);

  useLayoutEffect(() => {
    const frame = ownershipKnown ? { stamp: ownerStamp, ids: unlockedIds } : null;
    currentOwner.current = frame;
    return () => {
      if (currentOwner.current === frame) currentOwner.current = null;
    };
  }, [ownerStamp, ownershipKnown, unlockedIds]);

  usePageViewEvent({
    eventName: "library_viewed",
    actor: { id: user?.uid ?? null, loading: authLoading },
    ready: profileReady,
  });

  useEffect(() => {
    if (!targetDropId) {
      targetHandoff.current = null;
      return;
    }
    if (authLoading || !ownershipKnown || currentOwner.current?.stamp !== ownerStamp || !unlockedIds.has(targetDropId)) {
      return;
    }
    if (targetHandoff.current?.stamp === ownerStamp && targetHandoff.current.id === targetDropId) {
      return;
    }
    targetHandoff.current = { stamp: ownerStamp, id: targetDropId };
    router.replace(`/dashboard/viewer?id=${encodeURIComponent(targetDropId)}`);
  }, [authLoading, ownerStamp, ownershipKnown, router, targetDropId, unlockedIds]);

  const [browsing, setBrowsing] = useState({ ...defaultBrowsing, ownerStamp });
  const { searchQuery, selectedCategory, gridCols } = browsing.ownerStamp === ownerStamp ? browsing : defaultBrowsing;
  const updateBrowsing = (patch: Partial<typeof defaultBrowsing>) => {
    if (currentOwner.current?.stamp !== ownerStamp) return false;
    setBrowsing((previous) => ({
      ...(previous.ownerStamp === ownerStamp ? previous : defaultBrowsing),
      ...patch,
      ownerStamp,
    }));
    return true;
  };

  const filteredDrops = useMemo(() => {
    const filtered: Drop[] = [];
    const lowerSearch = searchQuery ? searchQuery.toLowerCase() : "";
    const filteringCategory = selectedCategory !== "All";
    for (const drop of unlockedDrops) {
      if (filteringCategory && drop.creatorId !== selectedCategory) continue;
      if (lowerSearch) {
        const titleMatches = drop.title.toLowerCase().includes(lowerSearch);
        const creatorMatches = Boolean(drop.creatorId?.toLowerCase().includes(lowerSearch));
        if (!titleMatches && !creatorMatches) continue;
      }
      filtered.push(drop);
    }
    return filtered;
  }, [unlockedDrops, searchQuery, selectedCategory]);

  const categories = useMemo(() => {
    const creators = new Set<string>();
    unlockedDrops.forEach((drop) => { if (drop.creatorId) creators.add(drop.creatorId); });
    return ["All", ...Array.from(creators).sort()];
  }, [unlockedDrops]);

  if (authLoading || !user) {
    return (
      <Card
        className="@container/library min-w-0 gap-4 px-4"
        role="status"
        data-mobile-density="compact"
        data-mobile-sprawl-guard="true"
        data-mobile-skeleton="user-library-route"
        data-mobile-organization="summary-first"
        data-mobile-drilldown="true"
        data-user-library-surface="my-kandydrops"
        data-user-library-loading-stable="true"
      >
        <h1 className="text-2xl font-semibold tracking-tight">My KandyDrops</h1>
        <p className="text-sm text-muted-foreground">Loading your collection…</p>
        <div className="grid grid-cols-1 gap-4 @lg/library:grid-cols-2 @5xl/library:grid-cols-3" aria-hidden="true">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="min-h-24 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
          ))}
        </div>
      </Card>
    );
  }

  const catalogMissing = ownershipKnown && unlockedIds.size > 0 && unlockedDrops.length === 0;
  const collectionAvailable = ownershipKnown && !catalogMissing;
  const partialCatalog = collectionAvailable && unlockedDrops.length < unlockedIds.size;
  const unavailableMessage = !profileReady
    ? "Your account details are unavailable. Reload to try again."
    : !ownershipKnown
      ? "Your collection details are unavailable. Reload to try again."
      : "Your owned Drops could not be loaded. Reload to try again.";

  return (
    <div
      className="min-w-0 space-y-6"
      data-mobile-density="compact"
      data-mobile-sprawl-guard="true"
      data-mobile-organization="summary-first"
      data-mobile-drilldown="true"
      data-user-library-surface="my-kandydrops"
    >
      <SignedInLibraryCollectionWall
        count={unlockedDrops.length}
        collectionAvailable={collectionAvailable}
        sourceNotice={partialCatalog ? "Some owned Drops are unavailable in this collection." : undefined}
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={(category) => { updateBrowsing({ selectedCategory: category }); }}
        searchQuery={searchQuery}
        onSearchChange={(query) => {
          if (!updateBrowsing({ searchQuery: query })) return;
          if (query.length > 2) trackEvent("library_search", { query });
        }}
        gridCols={gridCols}
        onGridColsChange={(value) => { updateBrowsing({ gridCols: value }); }}
        hasDrops={unlockedDrops.length > 0}
        hasResults={filteredDrops.length > 0}
        emptyContent={collectionAvailable ? (
          <Card className="items-center gap-3 px-4 text-center" data-mobile-density="compact" data-mobile-sprawl-guard="true">
            <Lock className="size-6 text-muted-foreground" aria-hidden="true" />
            <h2 className="text-xl font-semibold">No unwrapped Drops yet</h2>
            <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">Browse available Drops to start building your collection.</p>
            <Link href="/drops" className={buttonVariants({ variant: "brand" })}>Browse Drops</Link>
          </Card>
        ) : (
          <Card className="items-start gap-3 px-4" role="status" data-mobile-density="compact" data-mobile-sprawl-guard="true">
            <h2 className="text-xl font-semibold">Collection unavailable</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{unavailableMessage}</p>
            <Button variant="outline" onClick={() => window.location.reload()}>Reload collection</Button>
          </Card>
        )}
        noResultsContent={(
          <Card className="items-start gap-3 px-4" data-mobile-density="compact" data-mobile-sprawl-guard="true">
            <p className="text-sm leading-relaxed text-muted-foreground">No Drops match that search or filter.</p>
            <Button variant="outline" onClick={() => { updateBrowsing({ searchQuery: "", selectedCategory: "All" }); }}>Clear search and filters</Button>
          </Card>
        )}
      >
        {filteredDrops.map((drop) => (
          <OwnedDropGalleryCard
            key={drop.id}
            drop={drop}
            isUnlocked
            onOpen={() => {
              const owner = currentOwner.current;
              if (owner?.stamp !== ownerStamp || !owner.ids.has(drop.id)) return false;
              router.push(`/dashboard/viewer?id=${drop.id}`);
              return true;
            }}
          />
        ))}
      </SignedInLibraryCollectionWall>
    </div>
  );
}
