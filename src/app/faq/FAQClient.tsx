"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FAQSection } from "./faq-data";

type FAQClientProps = {
  sections: readonly FAQSection[];
};

function normalizeQuery(input: string): string {
  return input.trim().toLowerCase();
}

export function FAQClient({ sections }: FAQClientProps) {
  const [query, setQuery] = useState("");

  const filteredSections = useMemo(() => {
    const normalizedQuery = normalizeQuery(query);
    if (!normalizedQuery) {
      return sections;
    }

    return sections
      .map((section) => ({
        ...section,
        questions: section.questions.filter((item) => {
          const question = item.q.toLowerCase();
          const answer = item.a.toLowerCase();
          return question.includes(normalizedQuery) || answer.includes(normalizedQuery);
        }),
      }))
      .filter((section) => section.questions.length > 0);
  }, [query, sections]);

  return (
    <>
      <div className="max-w-xl mx-auto mb-16 relative">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <Search className="w-5 h-5 text-gray-500" />
        </div>
        <input
          type="search"
          placeholder="Search for answers..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-full py-4 pl-12 pr-6 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-pink/50 transition-all font-medium"
        />
      </div>

      {filteredSections.length === 0 ? (
        <div className="text-center py-20 text-gray-500 font-medium">No questions found matching "{query}"</div>
      ) : (
        <div className="space-y-16">
          {filteredSections.map((section) => (
            <section key={section.category} className="space-y-4">
              <h2 className="text-2xl font-bold text-brand-pink mb-6 flex items-center gap-2">
                <span className="w-8 h-px bg-brand-pink/50" />
                {section.category}
              </h2>

              <div className="grid gap-4">
                {section.questions.map((faq) => (
                  <details
                    key={`${section.category}-${faq.q}`}
                    className={cn(
                      "group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] hover:border-brand-pink/30 transition-all duration-300",
                      "open:border-brand-pink/50 open:bg-white/[0.04]"
                    )}
                  >
                    <summary className="list-none cursor-pointer px-5 md:px-6 py-5 md:py-6 flex items-center justify-between gap-4">
                      <h3 className="text-base md:text-lg font-semibold text-white">{faq.q}</h3>
                      <ChevronDown className="w-5 h-5 text-gray-400 group-open:text-brand-pink transition-transform duration-300 group-open:rotate-180 flex-shrink-0" />
                    </summary>
                    <div className="px-5 md:px-6 pb-5 md:pb-6 pt-0">
                      <div className="w-full h-px bg-white/5 mb-4" />
                      <p className="text-sm md:text-base text-gray-400 leading-relaxed font-medium">{faq.a}</p>
                    </div>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
