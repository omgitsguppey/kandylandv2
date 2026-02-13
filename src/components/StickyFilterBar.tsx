"use client";

import { Search, Sparkles, Clock, Flame, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRef, useState, useEffect } from "react";

interface FilterBarProps {
    categories: string[];
    selectedCategory: string;
    onSelectCategory: (category: string) => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
}

export default function StickyFilterBar({
    categories,
    selectedCategory,
    onSelectCategory,
    searchQuery,
    onSearchChange
}: FilterBarProps) {
    const [isSticky, setIsSticky] = useState(false);
    const [localSearch, setLocalSearch] = useState(searchQuery);
    const barRef = useRef<HTMLDivElement>(null);

    // Sync local state with prop if it changes externally (e.g. clear)
    useEffect(() => {
        setLocalSearch(searchQuery);
    }, [searchQuery]);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setLocalSearch(value);

        // Simple debounce
        const timeoutId = setTimeout(() => {
            onSearchChange(value);
        }, 300);
        return () => clearTimeout(timeoutId);
    };

    useEffect(() => {
        let rafId: number | null = null;

        const handleScroll = () => {
            if (rafId) return;

            rafId = requestAnimationFrame(() => {
                if (barRef.current) {
                    const rect = barRef.current.getBoundingClientRect();
                    // Setup threshold: navbar height is roughly 72px-80px
                    setIsSticky(rect.top <= 85);
                }
                rafId = null;
            });
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => {
            window.removeEventListener("scroll", handleScroll);
            if (rafId) cancelAnimationFrame(rafId);
        };
    }, []);

    const icons: Record<string, any> = {
        "All": GridIcon,
        "New": Sparkles,
        "Ending Soon": Clock,
        "Hottest": Flame,
    };

    return (
        <div
            ref={barRef}
            className={cn(
                "sticky top-[72px] z-40 py-3 transition-all duration-300",
                isSticky ? "bg-black/60 backdrop-blur-xl border-b border-white/10" : "bg-transparent"
            )}
        >
            <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col md:flex-row gap-4 items-center justify-between">

                {/* Search Input */}
                <div className="relative w-full md:w-64 group">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                        <Search className="w-4 h-4 text-gray-500 group-focus-within:text-brand-pink transition-colors" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search drops..."
                        value={localSearch}
                        onChange={handleSearchChange}
                        className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:bg-white/10 focus:border-brand-pink/50 transition-all"
                    />
                </div>

                {/* Categories (Horizontal Scroll) */}
                <div className="w-full md:w-auto overflow-x-auto no-scrollbar flex items-center gap-2 pb-1 md:pb-0">
                    {categories.map((cat) => {
                        const Icon = icons[cat] || Tag;
                        const isSelected = selectedCategory === cat;

                        return (
                            <button
                                key={cat}
                                onClick={() => onSelectCategory(cat)}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border",
                                    isSelected
                                        ? "bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)] scale-105"
                                        : "bg-white/5 text-gray-400 border-transparent hover:bg-white/10 hover:text-white"
                                )}
                            >
                                <Icon className={cn("w-3.5 h-3.5", isSelected ? "text-brand-pink" : "opacity-70")} />
                                {cat}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function GridIcon({ className }: { className?: string }) {
    return (
        <svg className={className} width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1.5 1.5H6.5V6.5H1.5V1.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M8.5 1.5H13.5V6.5H8.5V1.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M1.5 8.5H6.5V13.5H1.5V8.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M8.5 8.5H13.5V13.5H8.5V8.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}
