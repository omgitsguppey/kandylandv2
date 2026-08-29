import type { ReactNode } from "react";
import { Grid2X2, Grid3X3, Search } from "lucide-react";

type SignedInLibraryCollectionWallProps = {
  count: number;
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  gridCols: 2 | 3;
  onGridColsChange: (value: 2 | 3) => void;
  hasDrops: boolean;
  hasResults: boolean;
  emptyContent: ReactNode;
  noResultsContent: ReactNode;
  children: ReactNode;
};

export function SignedInLibraryCollectionWall({
  count,
  categories,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  gridCols,
  onGridColsChange,
  hasDrops,
  hasResults,
  emptyContent,
  noResultsContent,
  children,
}: SignedInLibraryCollectionWallProps) {
  return (
    <section className="relative isolate overflow-hidden" aria-labelledby="library-wall-title">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_8%_5%,rgba(178,140,255,0.22),transparent_30%),radial-gradient(circle_at_88%_10%,rgba(255,111,207,0.16),transparent_26%)]" />

      <header className="relative border-y border-white/10 py-6 sm:py-8">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.72fr)] xl:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-pink">Your collection</p>
            <h1 id="library-wall-title" className="mt-2 text-3xl font-black tracking-[-0.05em] text-white sm:text-5xl">My KandyDrops</h1>
            <p className="mt-3 text-sm leading-6 text-white/65">{count === 1 ? "One Drop is ready to revisit." : `${count} Drops are ready to revisit.`}</p>
          </div>

          <label className="relative block">
            <span className="sr-only">Search your KandyDrops</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-pink" aria-hidden="true" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search your KandyDrops"
              className="min-h-12 w-full rounded-2xl border border-white/15 bg-black/25 py-3 pl-12 pr-4 text-sm font-semibold text-white outline-none transition placeholder:text-white/40 focus:border-brand-pink/60 focus:ring-2 focus:ring-brand-pink/20"
            />
          </label>
        </div>

        {hasDrops ? (
          <div className="mt-5 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter your KandyDrops">
              {categories.map((category) => {
                const selected = category === selectedCategory;
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => onSelectCategory(category)}
                    aria-pressed={selected}
                    className={`min-h-11 shrink-0 rounded-xl border px-4 text-sm font-bold transition ${selected ? "border-brand-purple/50 bg-brand-purple text-white shadow-lg shadow-brand-purple/20" : "border-white/10 bg-white/[0.045] text-white/70 hover:bg-white/10 hover:text-white"}`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>

            <div className="inline-flex self-start rounded-xl border border-white/10 bg-black/20 p-1" role="group" aria-label="Library layout">
              <button
                type="button"
                onClick={() => onGridColsChange(2)}
                aria-pressed={gridCols === 2}
                aria-label="Use spacious collection wall"
                className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg transition ${gridCols === 2 ? "bg-brand-purple text-white" : "text-white/60 hover:bg-white/10 hover:text-white"}`}
              >
                <Grid2X2 className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => onGridColsChange(3)}
                aria-pressed={gridCols === 3}
                aria-label="Use compact collection wall"
                className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg transition ${gridCols === 3 ? "bg-brand-purple text-white" : "text-white/60 hover:bg-white/10 hover:text-white"}`}
              >
                <Grid3X3 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        ) : null}
      </header>

      <div className="relative pt-6 sm:pt-8">
        {!hasDrops ? emptyContent : hasResults ? (
          <div id="library-grid" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-12">{children}</div>
        ) : noResultsContent}
      </div>
    </section>
  );
}
