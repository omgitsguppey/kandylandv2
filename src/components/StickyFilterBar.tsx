"use client";

import { ChevronDown, ChevronUp, Clock, Flame, LayoutGrid, Search, Sparkles, Tag } from "lucide-react";
import { ChangeEvent, useEffect, useRef, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/Button";
import { SEARCH_COST_POLICY } from "@/lib/discovery/search-cost-contract";

interface FilterBarProps {
    categories: string[];
    selectedCategory: string;
    onSelectCategory: (category: string) => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    onSearchFocus?: () => void;
}

const COLLAPSED_CATEGORY_COUNT = 4;

export default function StickyFilterBar({ categories, selectedCategory, onSelectCategory, searchQuery, onSearchChange, onSearchFocus }: FilterBarProps) {
    const [localSearch, setLocalSearch] = useState(searchQuery);
    const [isExpanded, setIsExpanded] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => { setLocalSearch(searchQuery); }, [searchQuery]);
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            if (localSearch !== searchQuery) onSearchChange(localSearch);
        }, SEARCH_COST_POLICY.clientDebounceMs);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [localSearch, onSearchChange, searchQuery]);

    const triggerHaptic = () => {
        if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(5);
    };
    const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => setLocalSearch(event.target.value);
    const icons: Record<string, typeof Sparkles> = { All: LayoutGrid, New: Sparkles, "Ending Soon": Clock, Hottest: Flame };
    const visibleCategories = isExpanded
        ? categories
        : categories.filter((category, index) => index < COLLAPSED_CATEGORY_COUNT || category === selectedCategory);

    return (
        <Card className="py-0" data-drops-filter-bar="creative-tim-editorial">
            <CardContent className="grid min-w-0 gap-5 p-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,20rem),1fr))]">
            <label className="block min-w-0 space-y-2">
                <span className="text-sm font-medium">Search Drops</span>
                <span className="relative block min-w-0">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <Input type="search" inputMode="search" enterKeyHint="search" autoComplete="off" placeholder="Search the collection" value={localSearch} onChange={handleSearchChange} onFocus={onSearchFocus} className="pl-10" />
                </span>
            </label>
            <div className="min-w-0 space-y-2">
                <p className="text-sm font-medium text-foreground">Categories</p>
                <div className="flex min-w-0 flex-wrap items-end gap-2" aria-label="Drop filters">
                {visibleCategories.map((category) => {
                    const Icon = icons[category] || Tag;
                    const isSelected = selectedCategory === category;
                    return (
                        <Button key={category} type="button" variant={isSelected ? "brand" : "ghost"} size="sm" className="min-w-11 max-w-full gap-2 whitespace-normal [overflow-wrap:anywhere]" aria-pressed={isSelected} onClick={() => {
                            triggerHaptic();
                            onSelectCategory(category);
                            if (isExpanded) setIsExpanded(false);
                        }}>
                            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                            <span>{category}</span>
                        </Button>
                    );
                })}
                {categories.length > COLLAPSED_CATEGORY_COUNT ? (
                    <Button type="button" variant="ghost" size="sm" className="max-w-full gap-2 whitespace-normal" onClick={() => { triggerHaptic(); setIsExpanded((current) => !current); }} aria-label={isExpanded ? "Collapse Drop filters" : "Show all Drop filters"} aria-expanded={isExpanded}>
                        <span>{isExpanded ? "Fewer filters" : "More filters"}</span>
                        {isExpanded ? <ChevronUp className="h-4 w-4 shrink-0" aria-hidden="true" /> : <ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />}
                    </Button>
                ) : null}
                </div>
            </div>
            </CardContent>
        </Card>
    );
}
