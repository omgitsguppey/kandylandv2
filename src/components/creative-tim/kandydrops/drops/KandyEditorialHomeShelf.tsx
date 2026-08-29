import type { ReactNode } from "react";
import type { Drop } from "@/types/db";

type ShelfEntry = {
  drop: Drop;
  index: number;
};

type KandyEditorialHomeShelfProps = {
  drops: Drop[];
  renderDrop: (drop: Drop, index: number, presentation: "feature" | "shelf") => ReactNode;
};

function groupEntries<T>(entries: T[], size: number): T[][] {
  const groups: T[][] = [];

  for (let index = 0; index < entries.length; index += size) {
    groups.push(entries.slice(index, index + size));
  }

  return groups;
}

function isPromotionEntry(drop: Drop) {
  return drop.type === "promo" || drop.type === "external";
}

export function KandyEditorialHomeShelf({
  drops,
  renderDrop,
}: KandyEditorialHomeShelfProps) {
  const entries: ShelfEntry[] = drops.map((drop, index) => ({ drop, index }));
  const releases = entries.filter((entry) => !isPromotionEntry(entry.drop));
  const promotions = entries.filter((entry) => isPromotionEntry(entry.drop));
  const leadRelease = releases[0] ?? null;
  const secondaryGroups = groupEntries(releases.slice(1), 3);

  return (
    <div data-home-shelf-composition="editorial-release" className="space-y-5 lg:space-y-7">
      {leadRelease ? (
        <section data-home-shelf-zone="lead-release" className="relative">
          {renderDrop(leadRelease.drop, leadRelease.index, "feature")}
        </section>
      ) : null}

      {secondaryGroups.map((group, groupIndex) => (
        <section
          key={group[0]?.drop.id ?? "release-group-" + groupIndex}
          data-home-shelf-zone="release-group"
          className="relative"
          aria-label="Additional releases"
        >
          <div className="grid gap-5 min-[560px]:grid-cols-2 lg:grid-cols-12 lg:gap-7">
            {group.map((entry, entryIndex) => {
              const leadSecondary = entryIndex === 0;
              const accentDirection = groupIndex % 2 === 0;

              return (
                <div
                  key={entry.drop.id}
                  className={
                    leadSecondary
                      ? accentDirection
                        ? "lg:col-span-7"
                        : "lg:col-span-5"
                      : entryIndex === 1
                        ? accentDirection
                          ? "lg:col-span-5"
                          : "lg:col-span-7"
                        : "min-[560px]:col-span-2 lg:col-span-12"
                  }
                >
                  {renderDrop(entry.drop, entry.index, "shelf")}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {promotions.length > 0 ? (
        <aside
          data-home-shelf-zone="promotion-interlude"
          aria-label="Promotions"
          className="relative overflow-hidden rounded-[1.7rem] border border-pink-200/15 bg-[linear-gradient(135deg,rgba(236,72,153,0.13),rgba(124,58,237,0.14)_52%,rgba(6,4,20,0.72))] p-3 shadow-[0_22px_60px_rgba(11,4,26,0.28)] sm:p-4"
        >
          <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-pink-100/60 to-transparent" />
          <div className="relative grid gap-4 min-[560px]:grid-cols-2 lg:grid-cols-12 lg:gap-5">
            {promotions.map((entry, index) => (
              <div
                key={entry.drop.id}
                className={index === 0 ? "lg:col-span-7" : "lg:col-span-5"}
              >
                {renderDrop(entry.drop, entry.index, "shelf")}
              </div>
            ))}
          </div>
        </aside>
      ) : null}
    </div>
  );
}