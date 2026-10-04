import type { ReactNode } from "react";
import { KandyEditorialReleaseCollection } from "@/components/creative-tim/kandydrops/drops/KandyEditorialReleaseCollection";
import type { Drop } from "@/types/db";

type ShelfEntry = {
  drop: Drop;
  index: number;
};

type KandyEditorialHomeShelfProps = {
  drops: Drop[];
  renderDrop: (drop: Drop, index: number, presentation: "feature" | "shelf") => ReactNode;
};

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

  return (
    <div data-home-shelf-composition="content-grid" className="space-y-8">
      {releases.length > 0 ? (
        <div data-home-shelf-zone="releases">
          <KandyEditorialReleaseCollection>
          {releases.map((entry) => (
            <div key={entry.drop.id} className="min-w-0">
              {renderDrop(entry.drop, entry.index, "shelf")}
            </div>
          ))}
          </KandyEditorialReleaseCollection>
        </div>
      ) : null}

      {promotions.length > 0 ? (
        <aside
          data-home-shelf-zone="promotion-interlude"
          aria-labelledby="home-promotions-title"
          className="space-y-4 border-t border-border pt-6"
        >
          <h3 id="home-promotions-title" className="text-base font-medium text-muted-foreground">Promotions</h3>
          <KandyEditorialReleaseCollection>
            {promotions.map((entry) => (
              <div key={entry.drop.id} className="min-w-0">
                {renderDrop(entry.drop, entry.index, "shelf")}
              </div>
            ))}
          </KandyEditorialReleaseCollection>
        </aside>
      ) : null}
    </div>
  );
}
