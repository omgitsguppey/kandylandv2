import type { ReactNode } from "react";
import { Grid2X2, Grid3X3 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/creative-tim/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/creative-tim/ui/native-select";
import { cn } from "@/lib/utils";

type SignedInLibraryCollectionWallProps = {
  count: number;
  collectionAvailable?: boolean;
  sourceNotice?: string;
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

export function SignedInLibraryCollectionWall({ count, collectionAvailable = true, sourceNotice, categories, selectedCategory, onSelectCategory, searchQuery, onSearchChange, gridCols, onGridColsChange, hasDrops, hasResults, emptyContent, noResultsContent, children }: SignedInLibraryCollectionWallProps) {
  return (
    <section className="@container/library min-w-0 space-y-8" aria-labelledby="library-wall-title">
      <header className="min-w-0 space-y-6">
        <div className="space-y-2">
          <h1 id="library-wall-title" className="text-2xl font-semibold tracking-tight text-foreground">My KandyDrops</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">{collectionAvailable ? count === 1 ? "One Drop is ready to revisit." : `${count} Drops are ready to revisit.` : "Collection details are unavailable."}</p>
          {sourceNotice ? <p className="text-sm leading-relaxed text-muted-foreground" role="status">{sourceNotice}</p> : null}
        </div>
        {hasDrops ? (
          <div className="flex min-w-0 flex-wrap items-end gap-4">
            <label className="min-w-0 flex-[2_1_18rem] space-y-2">
              <span className="block text-sm font-medium text-foreground">Search your KandyDrops</span>
              <Input type="search" value={searchQuery} onChange={(event) => onSearchChange(event.target.value)} placeholder="Title or creator" />
            </label>
            <label className="min-w-0 flex-[1_1_12rem] space-y-2">
              <span className="block text-sm font-medium text-foreground">Creator</span>
              <NativeSelect aria-label="Filter your KandyDrops" value={selectedCategory} onChange={(event) => onSelectCategory(event.target.value)}>
                {categories.map((category) => <NativeSelectOption key={category} value={category}>{category === "All" ? "All creators" : category}</NativeSelectOption>)}
              </NativeSelect>
            </label>
            <div className="min-w-0 space-y-2">
              <p className="text-sm font-medium text-foreground">Layout</p>
              <div className="flex flex-wrap gap-1" role="group" aria-label="Library layout">
                <Button variant={gridCols === 2 ? "brand" : "ghost"} size="icon" onClick={() => onGridColsChange(2)} aria-pressed={gridCols === 2} aria-label="Use spacious collection wall"><Grid2X2 className="size-4" aria-hidden="true" /></Button>
                <Button variant={gridCols === 3 ? "brand" : "ghost"} size="icon" onClick={() => onGridColsChange(3)} aria-pressed={gridCols === 3} aria-label="Use compact collection wall"><Grid3X3 className="size-4" aria-hidden="true" /></Button>
              </div>
            </div>
          </div>
        ) : null}
      </header>
      {!hasDrops ? emptyContent : hasResults ? <div id="library-grid" className={cn("grid grid-cols-1 gap-x-4 gap-y-8 @lg/library:grid-cols-2", gridCols === 3 && "@5xl/library:grid-cols-3")}>{children}</div> : noResultsContent}
    </section>
  );
}
