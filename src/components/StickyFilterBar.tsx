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
        <div
            className="sticky top-[calc(env(safe-area-inset-top)+4.25rem)] z-40 -mx-1 rounded-[1.35rem] border border-brand-purple/20 bg-[linear-gradient(125deg,rgba(25,8,47,0.93),rgba(7,5,19,0.88))] p-1.5 shadow-[0_14px_38px_rgba(0,0,0,0.32)] backdrop-blur-xl md:top-24 md:mx-0 md:rounded-[1.5rem]"
            data-drops-filter-bar="compact"
            style={{ WebkitBackdropFilter: "blur(20px)" }}
        >
            <div className="grid gap-1.5 md:grid-cols-[minmax(14rem,18rem)_1fr] md:items-center md:gap-3">
                <label className="relative block">
                    <span className="sr-only">Search Drops</span>
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                    <input
                        type="search"
                        inputMode="search"
                        enterKeyHint="search"
                        autoComplete="off"
                        placeholder="Search Drops"
                        value={localSearch}
                        onChange={handleSearchChange}
                        onFocus={onSearchFocus}
                        className="h-11 w-full rounded-[1rem] border border-white/10 bg-white/[0.06] pl-9 pr-3 text-[13px] font-medium text-white outline-none transition-colors placeholder:text-gray-500 focus:border-brand-purple/65 focus:bg-brand-purple/[0.1] focus:ring-2 focus:ring-brand-purple/20"
                    />
                </label>

                <div className={cn(
                    "flex items-center gap-1.5",
                    isExpanded ? "flex-wrap" : "overflow-x-auto overscroll-x-contain pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
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
                                    "inline-flex h-11 shrink-0 items-center gap-1.5 rounded-[0.95rem] border px-3 text-[11px] font-bold transition-colors active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple/55",
                                    isSelected
                                        ? "border-brand-purple/50 bg-brand-purple/22 text-white shadow-[0_8px_18px_rgba(124,58,237,0.18)]"
                                        : "border-white/8 bg-white/[0.045] text-gray-400 hover:border-white/15 hover:bg-white/[0.075] hover:text-white",
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
                            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.95rem] border border-white/8 bg-white/[0.045] text-gray-400 transition-colors hover:border-white/15 hover:bg-white/[0.075] hover:text-white active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple/55"
                            aria-label={isExpanded ? "Collapse Drop filters" : "Show all Drop filters"}
                            aria-expanded={isExpanded}
                        >
                            {isExpanded ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
                        </button>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
