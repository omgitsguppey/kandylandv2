"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
          className="w-full bg-white/5 border border-white/10 rounded-full py-4 pl-12 pr-6 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-purple/40 focus:border-brand-purple/40 transition-colors font-medium"
        />
        <p className="mt-3 text-xs text-gray-500 text-center" aria-live="polite">
          Showing {totalVisibleQuestions} question{totalVisibleQuestions === 1 ? "" : "s"}
        </p>
      </div>

      {filteredSections.length === 0 ? (
        <div className="text-center py-20 text-gray-500 font-medium">No questions found matching &quot;{query}&quot;</div>
      ) : (
        <div className="space-y-14 md:space-y-16">
          {filteredSections.map((section) => (
            <section key={section.category} className="space-y-4">
              <h2 className="text-2xl font-bold text-brand-purple mb-6 flex items-center gap-2 tracking-tight">
                <span className="w-8 h-px bg-brand-purple/50" />
                {section.category}
              </h2>

              <div className="grid gap-4">
                {section.questions.map((faq) => {
                  const faqKey = `${section.category}-${faq.q}`;
                  const isOpen = openQuestionKey === faqKey;

                  return (
                    <motion.div
                      layout
                      key={faqKey}
                      className={cn(
                        "overflow-hidden rounded-2xl border transition-all duration-300",
                        isOpen
                          ? "border-brand-purple/40 bg-brand-purple/[0.05] shadow-[0_0_20px_rgba(164,118,255,0.1)]"
                          : "border-white/10 bg-white/[0.02] hover:border-brand-purple/30 glass-panel"
                      )}
                    >
                      <button
                        onClick={() => setOpenQuestionKey((prev) => (prev === faqKey ? null : faqKey))}
                        className="w-full text-left px-5 md:px-6 py-5 md:py-6 flex items-center justify-between gap-4"
                      >
                        <h3 className={cn("text-base md:text-lg font-semibold transition-colors duration-300", isOpen ? "text-brand-purple" : "text-white")}>{faq.q}</h3>
                        <ChevronDown className={cn("w-5 h-5 transition-transform duration-300 flex-shrink-0", isOpen ? "rotate-180 text-brand-purple" : "text-gray-400")} />
                      </button>
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                          >
                            <div className="px-5 md:px-6 pb-5 md:pb-6 pt-0">
                              <div className="w-full h-px bg-white/10 mb-4" />
                              <p className="text-sm md:text-base text-gray-300 leading-relaxed font-medium">{faq.a}</p>
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
    </>
  );
}
