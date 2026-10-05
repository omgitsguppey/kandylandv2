import type { ReactNode } from "react";
import { BookOpen } from "lucide-react";

import { Badge } from "@/components/ui/badge";

type KandyFaqExperienceProps = {
    children: ReactNode;
};

export function KandyFaqExperience({ children }: KandyFaqExperienceProps) {
    return (
        <main className="relative min-h-[calc(100dvh-8rem)] w-full overflow-hidden bg-[radial-gradient(circle_at_12%_8%,rgba(236,72,153,0.16),transparent_24%),radial-gradient(circle_at_88%_10%,rgba(168,85,247,0.2),transparent_28%),linear-gradient(180deg,#12051d_0%,#08030f_42%,#050208_100%)]">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[size:5rem_5rem] [mask-image:linear-gradient(to_bottom,black,transparent_42rem)]" aria-hidden="true" />
            <div className="pointer-events-none absolute -left-28 top-48 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-[90px] motion-reduce:hidden" aria-hidden="true" />

            <div
                className="relative z-10 mx-auto max-w-6xl px-4 pb-10 pt-5 sm:px-6 sm:pb-16 sm:pt-8 lg:px-8"
                style={{ paddingTop: "var(--kandy-cookie-offset, 0px)" }}
            >
                <header className="relative border-b border-white/12 pb-6 pt-6 sm:pb-8 sm:pt-8">
                    <div className="max-w-3xl">
                        <Badge className="h-8 gap-2 rounded-full border-pink-100/20 bg-white/[0.08] px-3 text-[10px] font-black uppercase tracking-[0.2em] text-pink-50 shadow-none hover:bg-white/[0.08]">
                            <BookOpen className="h-3.5 w-3.5 text-pink-200" />
                            The Kandy guide
                        </Badge>
                        <h1 className="mt-4 text-3xl font-black leading-[0.94] tracking-[-0.055em] text-white sm:text-5xl">
                            Answers that keep
                            <span className="block bg-[linear-gradient(105deg,#f9a8d4_0%,#e9d5ff_50%,#c084fc_100%)] bg-clip-text text-transparent">
                                your Kandy moving.
                            </span>
                        </h1>
                        <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70 sm:text-base sm:leading-7">
                            Get clear on Drops, GumDrops, your library, and daily rewards before you decide what to unwrap next.
                        </p>
                    </div>
                </header>

                <section className="mt-6 sm:mt-8" aria-label="KandyDrops help and answers">
                    {children}
                </section>
            </div>
        </main>
    );
}