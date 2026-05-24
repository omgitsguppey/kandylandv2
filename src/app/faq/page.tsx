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
    <div className="w-full relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[400px] bg-brand-purple/20 blur-[120px] rounded-full pointer-events-none opacity-50" />

      <div
        className="relative z-10 mx-auto max-w-4xl px-4 pb-4 md:px-8 md:pb-0"
        style={{ paddingTop: "var(--kandy-cookie-offset, 0px)" }}
      >
        <div className="mb-6 text-center sm:mb-10">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-brand-purple mb-3">How It Works</p>
          <h1 className="mx-auto mb-3 max-w-[9rem] text-[clamp(2rem,10vw,3.25rem)] font-black leading-[0.98] tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-400 min-[360px]:max-w-none md:text-5xl md:leading-[0.94]">
            How it works
          </h1>
          <p className="mx-auto max-w-xl text-sm text-gray-400 sm:text-lg">
            Tap through the five steps to see how KandyDrops works.
          </p>
        </div>

        <FAQClient sections={FAQ_SECTIONS} steps={HOW_IT_WORKS_STEPS} />
      </div>
    </div>
  );
}
