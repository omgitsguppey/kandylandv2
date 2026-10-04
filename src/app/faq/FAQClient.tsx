"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/telemetry";
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
  const [showAllFilters, setShowAllFilters] = useState(false);
  const deferredQuery = useDeferredValue(query);
  const lastTrackedSearchRef = useRef("");

  const searchableSections = useMemo(() => buildSearchableSections(sections), [sections]);

  useEffect(() => {
    trackEvent("faq_page_viewed");
  }, []);

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

  useEffect(() => {
    const normalizedQuery = normalizeQuery(deferredQuery);
    if (!normalizedQuery) {
      lastTrackedSearchRef.current = "";
      return;
    }

    if (normalizedQuery === lastTrackedSearchRef.current) {
      return;
    }

    lastTrackedSearchRef.current = normalizedQuery;
    trackEvent("faq_search_used", {
      query_length: normalizedQuery.length,
      result_count: totalVisibleQuestions,
      selected_category: selectedCategory,
    });
  }, [deferredQuery, selectedCategory, totalVisibleQuestions]);

  const categoryFilters = useMemo(
    () => ["All", ...sections.map((section) => section.category)],
    [sections]
  );
  const primaryCategoryFilters = categoryFilters.slice(0, 3);
  const extraCategoryFilters = categoryFilters.slice(3);
  const visibleFilters = primaryCategoryFilters;

  return (
    <div className="space-y-8 sm:space-y-12">
      <section className="relative overflow-hidden rounded-[2rem] border border-pink-100/14 bg-[linear-gradient(135deg,rgba(69,17,80,0.78),rgba(12,5,23,0.96)_64%,rgba(36,10,51,0.86))] p-4 shadow-[0_24px_76px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.1)] sm:p-6">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-fuchsia-300/12 blur-[68px]" aria-hidden="true" />
        <div className="relative mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-pink-100/70">The quick tour</p>
            <h2 className="mt-1 text-2xl font-black tracking-[-0.045em] text-white sm:text-3xl">Start with the sweet stuff.</h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-white/58">Move through the five steps, then use the guide below for the details.</p>
        </div>
        <HowItWorksStory steps={steps} />
      </section>

      <section className="relative space-y-5 overflow-hidden rounded-[2rem] border border-pink-100/14 bg-[linear-gradient(145deg,rgba(60,15,73,0.82),rgba(11,5,20,0.98)_60%,rgba(31,9,46,0.86))] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.09)] sm:p-6">
        <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-pink-100/45 to-transparent" />
        <div className="relative space-y-3">
          <div className="max-w-xl">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-pink-100/72">
              Find your answer
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.045em] text-white sm:text-3xl">
              The Kandy knowledge shelf.
            </h2>
          </div>

          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
              <Search className="h-5 w-5 text-pink-100/55" />
            </div>
            <input
              type="search"
              aria-label="Search frequently asked questions"
              placeholder="Search for answers..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="min-h-12 w-full rounded-[1.5rem] border border-white/10 bg-black/28 py-3 pl-12 pr-6 text-white placeholder:text-white/35 shadow-inner shadow-black/30 transition-colors focus:border-pink-100/45 focus:outline-none focus:ring-2 focus:ring-pink-200/20"
            />
          </div>
        </div>

        <div className="relative space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {visibleFilters.map((category) => {
              const isSelected = selectedCategory === category;

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(category);
                    trackEvent("faq_category_selected", {
                      category,
                      visible_questions: totalVisibleQuestions,
                    });
                  }}
                  className={cn(
                    "min-h-11 shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition-all",
                    isSelected
                      ? "border-pink-100/30 bg-pink-200/14 text-white shadow-[0_0_20px_rgba(236,72,153,0.14)]"
                      : "border-white/10 bg-black/20 text-white/58 hover:bg-white/[0.06]"
                  )}
                >
                  {category}
                </button>
              );
            })}
            {extraCategoryFilters.length > 0 ? (
              <button
                type="button"
                onClick={() => setShowAllFilters((current) => !current)}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs font-bold text-white/70 transition-colors hover:bg-white/[0.06]"
              >
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showAllFilters ? "rotate-180" : "")} />
                {showAllFilters ? "Fewer filters" : "More filters"}
              </button>
            ) : null}
          </div>
          {showAllFilters && extraCategoryFilters.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              {extraCategoryFilters.map((category) => {
                const isSelected = selectedCategory === category;

                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(category);
                      trackEvent("faq_category_selected", {
                        category,
                        visible_questions: totalVisibleQuestions,
                      });
                    }}
                    className={cn(
                      "min-h-11 rounded-full border px-4 py-2 text-xs font-bold transition-all",
                      isSelected
                        ? "border-pink-100/30 bg-pink-200/14 text-white shadow-[0_0_20px_rgba(236,72,153,0.14)]"
                        : "border-white/10 bg-black/20 text-white/58 hover:bg-white/[0.06]"
                    )}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-3">
            <div />
            <p className="shrink-0 rounded-full border border-white/8 bg-black/20 px-3 py-1.5 text-xs text-white/48" aria-live="polite">
              {totalVisibleQuestions} answer{totalVisibleQuestions === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      </section>

      {filteredSections.length === 0 ? (
        <div className="rounded-[2rem] border border-pink-100/12 bg-[linear-gradient(145deg,rgba(57,15,70,0.64),rgba(10,4,18,0.94))] py-20 text-center font-medium text-white/55">
          No questions found matching &quot;{query}&quot;
        </div>
      ) : (
        <div className="space-y-9 md:space-y-11">
          {filteredSections.map((section) => (
            <section key={section.category} className="space-y-4">
              <h3 className="flex items-center gap-3 text-xl font-black tracking-[-0.03em] text-white sm:text-2xl">
                <span className="h-px w-8 bg-gradient-to-r from-pink-200 to-brand-purple" />
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
                        "overflow-hidden rounded-[1.55rem] border bg-[linear-gradient(145deg,rgba(58,15,69,0.66),rgba(10,4,18,0.95))] transition-all duration-300",
                        isOpen
                          ? "border-pink-100/35 shadow-[0_0_26px_rgba(236,72,153,0.14)]"
                          : "border-white/10 hover:border-pink-100/22"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          const nextState = openQuestionKey === faqKey ? null : faqKey;
                          setOpenQuestionKey(nextState);
                          trackEvent("faq_question_toggled", {
                            category: section.category,
                            question: faq.q,
                            action: nextState === faqKey ? "opened" : "closed",
                          });
                        }}
                        className="flex min-h-14 w-full items-center justify-between gap-4 px-5 py-5 text-left sm:px-6 sm:py-6"
                      >
                        <h4
                          className={cn(
                            "text-base font-semibold transition-colors sm:text-lg",
                            isOpen ? "text-pink-100" : "text-white"
                          )}
                        >
                          {faq.q}
                        </h4>
                        <ChevronDown
                          className={cn(
                            "h-5 w-5 shrink-0 transition-transform duration-300",
                            isOpen ? "rotate-180 text-pink-100" : "text-white/42"
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
                              <div className="mb-4 h-px w-full bg-gradient-to-r from-pink-100/25 via-white/10 to-transparent" />
                              <p className="text-sm leading-7 text-white/70 sm:text-base">{faq.a}</p>
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
