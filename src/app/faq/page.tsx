import { FAQClient } from "./FAQClient";
import { FAQ_SECTIONS, HOW_IT_WORKS_STEPS } from "./faq-data";

export default function FAQPage() {
  return (
    <div className="w-full relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[400px] bg-brand-purple/20 blur-[120px] rounded-full pointer-events-none opacity-50" />

      <div className="relative z-10 mx-auto max-w-4xl px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:px-8 md:pb-0">
        <div className="mb-6 text-center sm:mb-10">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-brand-purple mb-3">How It Works</p>
          <h1 className="mx-auto mb-4 max-w-[12rem] text-[clamp(2.7rem,13vw,3.75rem)] font-black leading-[0.92] tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-400 min-[380px]:max-w-none md:text-5xl md:leading-[0.94]">
            How KandyDrops Work
          </h1>
          <p className="mx-auto max-w-2xl text-sm text-gray-400 sm:text-lg">
            Your mobile guide to Gum Drops, live KandyDrops, library access, and daily Experiences rewards.
          </p>
        </div>

        <FAQClient sections={FAQ_SECTIONS} steps={HOW_IT_WORKS_STEPS} />

        <div className="mt-16 sm:mt-24 text-center glass-panel p-8 rounded-3xl border border-white/10 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-brand-purple/10 via-brand-purple/10 to-brand-purple/10" />
          <div className="relative z-10">
            <h3 className="text-2xl font-bold text-white mb-2">Still need help?</h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              If you still need help after the mobile guide and FAQs, reach out to support and we&apos;ll help you keep unwrapping.
            </p>
            <a
              href="mailto:support@kandydrops.com"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-white text-black font-bold hover:scale-105 transition-transform shadow-[0_0_30px_rgba(255,255,255,0.2)]"
            >
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
