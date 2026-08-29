"use client";

import { ChevronDown, ChevronUp, Clock, Flame, LayoutGrid, Search, Sparkles, Tag } from "lucide-react";
import { ChangeEvent, useEffect, useRef, useState } from "react";

import { SEARCH_COST_POLICY } from "@/lib/discovery/search-cost-contract";
import { cn } from "@/lib/utils";

interface FilterBarProps {
    categories: string[];
    selectedCategory: string;
    onSelectCategory: (category: string) => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    onSearchFocus?: () => void;
}

const COLLAPSED_CATEGORY_COUNT = 4;

export default function StickyFilterBar({
    categories,
    selectedCategory,
    onSelectCategory,
    searchQuery,
    onSearchChange,
    onSearchFocus,
}: FilterBarProps) {
    const [localSearch, setLocalSearch] = useState(searchQuery);
    const [isExpanded, setIsExpanded] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        setLocalSearch(searchQuery);
    }, [searchQuery]);

    useEffect(() => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
            if (localSearch !== searchQuery) {
                onSearchChange(localSearch);
            }
        }, SEARCH_COST_POLICY.clientDebounceMs);

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [localSearch, onSearchChange, searchQuery]);

    const triggerHaptic = () => {
        if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate(5);
        }
    };

    const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
        setLocalSearch(event.target.value);
    };

    const icons: Record<string, typeof Sparkles> = {
        All: LayoutGrid,
        New: Sparkles,
        "Ending Soon": Clock,
        Hottest: Flame,
    };

    const visibleCategories = isExpanded ? categories : categories.slice(0, COLLAPSED_CATEGORY_COUNT);

    return (
        <div className="flex flex-col gap-3 py-3 md:flex-row md:items-center md:gap-6" data-drops-filter-bar="creative-tim-editorial">
            <label className="relative block min-w-0 md:w-[18rem]">
                <span className="sr-only">Search Drops</span>
                <Search className="pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-purple" />
                <input
                    type="search"
                    inputMode="search"
                    enterKeyHint="search"
                    autoComplete="off"
                    placeholder="Search the collection"
                    value={localSearch}
                    onChange={handleSearchChange}
                    onFocus={onSearchFocus}
                    className="h-11 w-full border-b border-white/15 bg-transparent pl-7 pr-1 text-sm font-semibold text-white outline-none transition-colors placeholder:text-gray-500 focus:border-brand-purple focus:ring-0"
                />
            </label>

            <div className={cn(
                "flex min-w-0 items-center gap-3",
                isExpanded ? "flex-wrap" : "overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            )}>
                {visibleCategories.map((category) => {
                    const Icon = icons[category] || Tag;
                    const isSelected = selectedCategory === category;

                    return (
                        <button
                            key={category}
                            type="button"
                            onClick={() => {
                                triggerHaptic();
                                onSelectCategory(category);
                                if (isExpanded) {
                                    setIsExpanded(false);
                                }
                            }}
                            className={cn(
                                "inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-1 text-xs font-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple/55",
                                isSelected
                                    ? "border-brand-purple text-white"
                                    : "border-transparent text-gray-500 hover:border-white/30 hover:text-white",
                            )}
                            aria-pressed={isSelected}
                        >
                            <Icon className={cn("h-3.5 w-3.5", isSelected ? "text-brand-purple" : "opacity-70")} />
                            <span>{category}</span>
                        </button>
                    );
                })}

                {categories.length > COLLAPSED_CATEGORY_COUNT ? (
                    <button
                        type="button"
                        onClick={() => {
                            triggerHaptic();
                            setIsExpanded((current) => !current);
                        }}
                        className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center border-l border-white/10 text-gray-300 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple/55"
                        aria-label={isExpanded ? "Collapse Drop filters" : "Show all Drop filters"}
                        aria-expanded={isExpanded}
                    >
                        {isExpanded ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
                    </button>
                ) : null}
            </div>
        </div>
    );
}
