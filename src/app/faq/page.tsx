import { FAQClient } from "./FAQClient";
import { FAQ_SECTIONS } from "./faq-data";

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-black pt-24 pb-20 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[400px] bg-brand-pink/20 blur-[120px] rounded-full pointer-events-none opacity-50" />

      <div className="max-w-4xl mx-auto px-4 md:px-8 relative z-10">
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-400 mb-4 tracking-tight">
            Frequently Asked Questions
          </h1>
          <p className="text-gray-400 text-lg">Everything you need to know about unwrapping KandyDrops.</p>
        </div>

        <FAQClient sections={FAQ_SECTIONS} />

        <div className="mt-24 text-center glass-panel p-8 rounded-3xl border border-white/10 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-brand-pink/10 via-brand-purple/10 to-brand-cyan/10" />
          <div className="relative z-10">
            <h3 className="text-2xl font-bold text-white mb-2">Still have questions?</h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              Can&apos;t find the answer you&apos;re looking for? Reach out to our customer support team for help.
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
