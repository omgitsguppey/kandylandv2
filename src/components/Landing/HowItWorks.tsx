"use client";

import { PackageOpen, Sparkles, TrendingUp } from "lucide-react";

export function HowItWorks() {
    return (
        <section className="py-24 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-black to-zinc-900/50 pointer-events-none" />

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">How it works</h2>
                    <p className="text-gray-400 text-lg max-w-2xl mx-auto">Get started in seconds. No crypto required.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
                    {/* Step 1 */}
                    <div className="relative flex flex-col items-center text-center group">
                        <div className="w-16 h-16 rounded-2xl bg-brand-cyan/20 text-brand-cyan flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-brand-cyan group-hover:text-white transition-all duration-300">
                            <span className="text-2xl font-bold">1</span>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3">Join the Drop</h3>
                        <p className="text-gray-400">Sign up instantly with Google or Email. We'll give you <strong className="text-brand-pink">50 free Gum Drops</strong> to get started.</p>

                        <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-[2px] bg-gradient-to-r from-brand-cyan/30 to-brand-purple/30" />
                    </div>

                    {/* Step 2 */}
                    <div className="relative flex flex-col items-center text-center group">
                        <div className="w-16 h-16 rounded-2xl bg-brand-purple/20 text-brand-purple flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-brand-purple group-hover:text-white transition-all duration-300">
                            <span className="text-2xl font-bold">2</span>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3">Find Experiences</h3>
                        <p className="text-gray-400">Browse exclusive digital drops created by your favorite creators and brands.</p>

                        <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-[2px] bg-gradient-to-r from-brand-purple/30 to-brand-pink/30" />
                    </div>

                    {/* Step 3 */}
                    <div className="relative flex flex-col items-center text-center group">
                        <div className="w-16 h-16 rounded-2xl bg-brand-pink/20 text-brand-pink flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-brand-pink group-hover:text-white transition-all duration-300">
                            <span className="text-2xl font-bold">3</span>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3">Unwrap & Own</h3>
                        <p className="text-gray-400">Spend Gum Drops to unlock the content. Once unwrapped, it's securely yours forever.</p>
                    </div>
                </div>

                <div className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto border border-white/10 rounded-3xl p-8 bg-black/40 backdrop-blur-md">
                    <div className="text-center border-r border-white/5 last:border-0 md:border-r">
                        <div className="text-3xl md:text-4xl font-black text-white mb-1">500+</div>
                        <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Active Collectors</div>
                    </div>
                    <div className="text-center border-r border-white/5 md:border-r-0 lg:border-r">
                        <div className="text-3xl md:text-4xl font-black text-brand-pink mb-1">10k+</div>
                        <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Total Unwraps</div>
                    </div>
                    <div className="text-center border-r border-white/5 md:border-r">
                        <div className="text-3xl md:text-4xl font-black text-brand-cyan mb-1">99%</div>
                        <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Creator Payout</div>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl md:text-4xl font-black text-brand-green mb-1 flex items-center justify-center gap-1"><TrendingUp className="w-6 h-6" /></div>
                        <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Growth</div>
                    </div>
                </div>
            </div>
        </section>
    );
}
