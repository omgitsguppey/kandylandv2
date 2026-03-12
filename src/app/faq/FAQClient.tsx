"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { cn } from "@/lib/utils";
import { HowItWorksStory } from "./HowItWorksStory";
import type { FAQSection, HowItWorksStep } from "./faq-data";

type FAQClientProps = {
  sections: readonly FAQSection[];
  steps: readonly HowItWorksStep[];
};

type SearchableFAQEntry = {
  readonly q: string;
  readonly a: string;
  readonly qNormalized: string;
  readonly aNormalized: string;
};

type SearchableFAQSection = {
  readonly category: string;
  readonly questions: readonly SearchableFAQEntry[];
};

function normalizeQuery(input: string): string {
  return input.trim().toLowerCase();
}

function buildSearchableSections(sections: readonly FAQSection[]): readonly SearchableFAQSection[] {
  return sections.map((section) => ({
    category: section.category,
    questions: section.questions.map((item) => ({
      q: item.q,
      a: item.a,
      qNormalized: item.q.toLowerCase(),
      aNormalized: item.a.toLowerCase(),
    })),
  }));
}

export function FAQClient({ sections, steps }: FAQClientProps) {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [openQuestionKey, setOpenQuestionKey] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query);

  const searchableSections = useMemo(() => buildSearchableSections(sections), [sections]);

  const filteredSections = useMemo(() => {
    const normalizedQuery = normalizeQuery(deferredQuery);
    const searchedSections = !normalizedQuery
      ? searchableSections
      : searchableSections
          .map((section) => ({
            category: section.category,
            questions: section.questions.filter(
              (item) =>
                item.qNormalized.includes(normalizedQuery) ||
                item.aNormalized.includes(normalizedQuery)
            ),
          }))
          .filter((section) => section.questions.length > 0);

    if (selectedCategory === "All") {
      return searchedSections;
    }

    return searchedSections.filter((section) => section.category === selectedCategory);
  }, [deferredQuery, searchableSections, selectedCategory]);

  const totalVisibleQuestions = useMemo(
    () => filteredSections.reduce((count, section) => count + section.questions.length, 0),
    [filteredSections]
  );

  const categoryFilters = useMemo(
    () => ["All", ...sections.map((section) => section.category)],
    [sections]
  );

  return (
    <div className="space-y-10 sm:space-y-14">
      <HowItWorksStory steps={steps} />

      <section className="space-y-4 rounded-[2rem] border border-white/10 bg-white/[0.03] p-4 sm:p-6">
        <div className="space-y-3">
          <div className="max-w-xl">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-brand-purple">
              Quick answers
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
              Search or browse the details
            </h2>
            <p className="mt-2 text-sm leading-7 text-gray-400 sm:text-base">
              Start with the mobile guide above, then use the questions below for specifics about
              Gum Drops, live drops, your library, and daily Experiences.
            </p>
          </div>

          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
              <Search className="h-5 w-5 text-gray-500" />
            </div>
            <input
              type="search"
              aria-label="Search frequently asked questions"
              placeholder="Search for answers..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full rounded-[1.5rem] border border-white/10 bg-black/35 py-4 pl-12 pr-6 text-white placeholder-gray-500 transition-colors focus:border-brand-purple/40 focus:outline-none focus:ring-2 focus:ring-brand-purple/25"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {categoryFilters.map((category) => {
              const isSelected = selectedCategory === category;

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={cn(
                    "shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition-all",
                    isSelected
                      ? "border-brand-purple/40 bg-brand-purple/15 text-white shadow-[0_0_20px_rgba(164,118,255,0.14)]"
                      : "border-white/10 bg-white/[0.03] text-gray-400"
                  )}
                >
                  {category}
                </button>
              );
            })}
          </div>
          <p className="shrink-0 text-xs text-gray-500" aria-live="polite">
            {totalVisibleQuestions} answer{totalVisibleQuestions === 1 ? "" : "s"}
          </p>
        </div>
      </section>

      {filteredSections.length === 0 ? (
        <div className="rounded-[2rem] border border-white/10 bg-black/30 py-20 text-center text-gray-500 font-medium">
          No questions found matching &quot;{query}&quot;
        </div>
      ) : (
        <div className="space-y-10 md:space-y-12">
          {filteredSections.map((section) => (
            <section key={section.category} className="space-y-4">
              <h3 className="flex items-center gap-2 text-xl font-bold tracking-tight text-brand-purple sm:text-2xl">
                <span className="h-px w-8 bg-brand-purple/50" />
                {section.category}
              </h3>

              <div className="grid gap-4">
                {section.questions.map((faq) => {
                  const faqKey = `${section.category}-${faq.q}`;
                  const isOpen = openQuestionKey === faqKey;

                  return (
                    <motion.div
                      layout
                      key={faqKey}
                      className={cn(
                        "overflow-hidden rounded-[1.5rem] border transition-all duration-300",
                        isOpen
                          ? "border-brand-purple/35 bg-brand-purple/[0.05] shadow-[0_0_20px_rgba(164,118,255,0.1)]"
                          : "border-white/10 bg-white/[0.02] hover:border-brand-purple/20"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setOpenQuestionKey((prev) => (prev === faqKey ? null : faqKey))
                        }
                        className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left sm:px-6 sm:py-6"
                      >
                        <h4
                          className={cn(
                            "text-base font-semibold transition-colors sm:text-lg",
                            isOpen ? "text-brand-purple" : "text-white"
                          )}
                        >
                          {faq.q}
                        </h4>
                        <ChevronDown
                          className={cn(
                            "h-5 w-5 shrink-0 transition-transform duration-300",
                            isOpen ? "rotate-180 text-brand-purple" : "text-gray-400"
                          )}
                        />
                      </button>
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: "easeInOut" }}
                          >
                            <div className="px-5 pb-5 pt-0 sm:px-6 sm:pb-6">
                              <div className="mb-4 h-px w-full bg-white/10" />
                              <p className="text-sm leading-7 text-gray-300 sm:text-base">{faq.a}</p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
