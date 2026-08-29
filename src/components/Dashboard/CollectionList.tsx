"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutGrid } from "lucide-react";

import { buildDashboardCollectionState } from "@/lib/drop-dashboard";
import { cn } from "@/lib/utils";
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

    const {
      visibleDrops: visible,
      ownedDrops: ownedVisible,
      lockedDrops: lockedVisible,
      ownedCount: owned,
      lockedCount: locked,
    } = buildDashboardCollectionState(drops, ids, currentTimeMs);

    return {
      ownedIds: ids,
      visibleDrops: visible,
      ownedDrops: ownedVisible,
      lockedDrops: lockedVisible,
      ownedCount: owned,
      lockedCount: locked,
    };
  }, [currentTimeMs, drops, userProfile?.unlockedContent]);

  const filteredDrops = filter === "owned"
    ? ownedDrops
    : filter === "locked"
      ? lockedDrops
      : visibleDrops;

  return (
    <section
      className="relative isolate overflow-hidden border-y border-white/10 py-1 text-white"
      data-mobile-residual-cleanup="score-impact"
    >
      <div aria-hidden="true" className="pointer-events-none absolute -left-16 top-0 h-48 w-48 rounded-full bg-brand-purple/12 blur-3xl" />
      <header className="relative grid gap-5 px-1 py-6 sm:px-2 sm:py-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-purple">
            <LayoutGrid className="h-4 w-4" aria-hidden="true" />
            Collection
          </div>
          <h2 className="text-2xl font-black tracking-[-0.04em] text-white sm:text-3xl">My KandyDrops</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
            Revisit the Drops you own or find the next one to unwrap.
          </p>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-300">
            <span><strong className="font-semibold text-white">{ownedCount}</strong> unwrapped</span>
            <span><strong className="font-semibold text-white">{lockedCount}</strong> waiting</span>
            <span><strong className="font-semibold text-white">{visibleDrops.length}</strong> available</span>
          </div>
        </div>

        <div
          className="grid w-full grid-cols-3 rounded-2xl border border-white/10 bg-black/20 p-1 sm:w-auto"
          role="group"
          aria-label="Filter drops by ownership"
        >
          {(["all", "owned", "locked"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                setFilter(option);
                trackEvent("collection_filter_changed", { filter_value: option });
              }}
              aria-pressed={filter === option}
              className={cn(
                "inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl px-3 text-sm font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple/40 sm:min-w-20 sm:px-4",
                filter === option ? "bg-brand-purple text-white shadow-lg shadow-brand-purple/25" : "text-slate-400 hover:bg-white/10 hover:text-white",
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </header>
      <div className="relative h-px bg-white/10" />

      <div className="relative py-5 sm:py-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-12">
          {filteredDrops.map((drop, index) => {
            const unlocked = ownedIds.has(drop.id);
            return (
              <div
                key={drop.id}
                className={cn(
                  "min-w-0",
                  index === 0 ? "sm:col-span-2 xl:col-span-7" : index === 1 ? "xl:col-span-5" : "xl:col-span-4",
                )}
              >
                <OwnedDropGalleryCard
                  drop={drop}
                  isUnlocked={unlocked}
                  onOpen={() => {
                    if (unlocked) {
                      router.push(`/dashboard/viewer?id=${drop.id}`);
                      return;
                    }
                    router.push("/drops");
                  }}
                />
              </div>
            );
          })}

          {filteredDrops.length === 0 ? (
            <div className="col-span-full rounded-3xl border border-white/10 bg-black/20 px-4 py-10 text-center sm:py-14" data-mobile-residual-cleanup="score-impact">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-purple/10 shadow-inner shadow-brand-purple/10 sm:h-16 sm:w-16">
                <LayoutGrid className="h-7 w-7 text-brand-purple sm:h-8 sm:w-8" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-white">No Drops to show</h3>
              <p className="mx-auto mb-6 max-w-xs text-sm leading-6 text-slate-300">
                {filter === "owned"
                  ? "You haven't unwrapped any Drops yet."
                  : filter === "locked"
                    ? "You've unwrapped every active Drop."
                    : "No Drops are available right now."}
              </p>
              <a
                href="/drops"
                className="inline-flex min-h-11 items-center rounded-xl bg-brand-purple px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-purple/25 transition hover:bg-fuchsia-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:px-7"
              >
                Browse Drops
              </a>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
