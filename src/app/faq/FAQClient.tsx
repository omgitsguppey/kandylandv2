"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FAQSection } from "./faq-data";

type FAQClientProps = {
  sections: readonly FAQSection[];
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

export function FAQClient({ sections }: FAQClientProps) {
  const [query, setQuery] = useState("");
  const [openQuestionKey, setOpenQuestionKey] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query);

  const searchableSections = useMemo(() => buildSearchableSections(sections), [sections]);

  const filteredSections = useMemo(() => {
    const normalizedQuery = normalizeQuery(deferredQuery);
    if (!normalizedQuery) {
      return searchableSections;
    }

    return searchableSections
      .map((section) => ({
        category: section.category,
        questions: section.questions.filter(
          (item) => item.qNormalized.includes(normalizedQuery) || item.aNormalized.includes(normalizedQuery)
        ),
      }))
      .filter((section) => section.questions.length > 0);
  }, [deferredQuery, searchableSections]);

  const totalVisibleQuestions = useMemo(
    () => filteredSections.reduce((count, section) => count + section.questions.length, 0),
    [filteredSections]
  );

  return (
    <>
      <div className="max-w-xl mx-auto mb-16 relative">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <Search className="w-5 h-5 text-gray-500" />
        </div>
        <input
          type="search"
          aria-label="Search frequently asked questions"
          placeholder="Search for answers..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-full py-4 pl-12 pr-6 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-pink/40 focus:border-brand-pink/40 transition-colors font-medium"
        />
        <p className="mt-3 text-xs text-gray-500 text-center" aria-live="polite">
          Showing {totalVisibleQuestions} question{totalVisibleQuestions === 1 ? "" : "s"}
        </p>
      </div>

      {filteredSections.length === 0 ? (
        <div className="text-center py-20 text-gray-500 font-medium">No questions found matching "{query}"</div>
      ) : (
        <div className="space-y-14 md:space-y-16">
          {filteredSections.map((section) => (
            <section key={section.category} className="space-y-4">
              <h2 className="text-2xl font-bold text-brand-pink mb-6 flex items-center gap-2 tracking-tight">
                <span className="w-8 h-px bg-brand-pink/50" />
                {section.category}
              </h2>

              <div className="grid gap-4">
                {section.questions.map((faq) => {
                  const faqKey = `${section.category}-${faq.q}`;
                  const isOpen = openQuestionKey === faqKey;

                  return (
                    <div
                      key={faqKey}
                      className={cn(
                        "overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] hover:border-brand-pink/30 transition-colors duration-200",
                        isOpen && "border-brand-pink/50 bg-white/[0.04]"
                      )}
                    >
                      <button
                        onClick={() => setOpenQuestionKey((prev) => (prev === faqKey ? null : faqKey))}
                        className="w-full text-left px-5 md:px-6 py-5 md:py-6 flex items-center justify-between gap-4"
                      >
                        <h3 className="text-base md:text-lg font-semibold text-white">{faq.q}</h3>
                        <ChevronDown className={cn("w-5 h-5 text-gray-400 transition-transform duration-200", isOpen && "rotate-180 text-brand-pink")} />
                      </button>
                      {isOpen && (
                        <div className="px-5 md:px-6 pb-5 md:pb-6 pt-0">
                          <div className="w-full h-px bg-white/5 mb-4" />
                          <p className="text-sm md:text-base text-gray-400 leading-relaxed font-medium">{faq.a}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
