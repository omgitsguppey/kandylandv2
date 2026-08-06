import type { Metadata } from "next";

import { FAQClient } from "./FAQClient";
import { FAQ_SECTIONS, HOW_IT_WORKS_STEPS } from "./faq-data";

export const metadata: Metadata = {
  title: "FAQ",
  description: "The mobile guide to KandyDrops, including Gum Drops, live drops, library access, and daily rewards.",
  alternates: {
    canonical: "/faq",
  },
};

export default function FAQPage() {
  return (
    <main className="relative w-full overflow-hidden">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[28rem] w-[42rem] max-w-[130vw] -translate-x-1/2 rounded-full bg-brand-purple/20 blur-[130px] opacity-55" />
      <div className="pointer-events-none absolute -right-28 top-72 h-64 w-64 rounded-full bg-fuchsia-500/10 blur-[110px]" />

      <div
        className="relative z-10 mx-auto max-w-5xl px-4 pb-6 pt-2 md:px-8 md:pb-10"
        style={{ paddingTop: "var(--kandy-cookie-offset, 0px)" }}
      >
        <header className="relative mb-6 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.035] px-5 py-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:mb-10 sm:px-10 sm:py-12">
          <div className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-brand-purple/60 to-transparent" />
          <p className="mb-3 text-[11px] font-black uppercase tracking-[0.26em] text-brand-purple">How It Works</p>
          <h1 className="mx-auto mb-4 max-w-[9rem] text-[clamp(2rem,10vw,3.25rem)] font-black leading-[0.98] tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-gray-400 min-[360px]:max-w-none md:text-5xl md:leading-[0.94]">
            How it works
          </h1>
          <p className="mx-auto max-w-xl text-sm leading-6 text-gray-300 sm:text-lg sm:leading-7">
            Tap through the five steps to see how KandyDrops works.
          </p>
        </header>

        <FAQClient sections={FAQ_SECTIONS} steps={HOW_IT_WORKS_STEPS} />
      </div>
    </main>
  );
}
