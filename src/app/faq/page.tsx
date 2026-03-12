import { FAQClient } from "./FAQClient";
import { FAQ_SECTIONS, HOW_IT_WORKS_STEPS } from "./faq-data";

export default function FAQPage() {
  return (
    <div className="w-full relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[400px] bg-brand-purple/20 blur-[120px] rounded-full pointer-events-none opacity-50" />

      <div className="max-w-4xl mx-auto px-4 md:px-8 relative z-10">
        <div className="text-center mb-8 sm:mb-10">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-brand-purple mb-3">How It Works</p>
          <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-400 mb-4 tracking-tight">
            How KandyDrops Work
          </h1>
          <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto">
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
