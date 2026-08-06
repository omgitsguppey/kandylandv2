import { getDrops } from "@/lib/server/drops";
import { isDropActiveNow } from "@/lib/drop-status";
import { listCreatorDiscoveryProfiles } from "@/lib/server/creator-discovery";
import Hero from "@/components/Hero";
import { HowItWorks } from "@/components/Landing/HowItWorks";
import { CreatorDiscoveryRail } from "@/components/CreatorDiscoveryRail";
import HomeClient from "./HomeClient";

export const dynamic = "force-dynamic";

export default async function HomePage() {
    const [drops, initialCreators] = await Promise.all([
        getDrops(),
        listCreatorDiscoveryProfiles("home"),
    ]);
    const initialActiveDrops = drops.filter((drop) => isDropActiveNow(drop));

    return (
        <>
            <HomeClient />
            <div
                className="relative isolate min-h-screen overflow-x-clip bg-[#06020c] pb-4 md:pb-0"
                data-home-modules-hydration="staged"
                style={{ paddingTop: "var(--kandy-cookie-offset, 0px)" }}
            >
                <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
                    <div className="absolute left-1/2 top-0 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-brand-purple/15 blur-[140px] motion-reduce:hidden" />
                    <div className="absolute -left-40 top-[38rem] h-[30rem] w-[30rem] rounded-full bg-fuchsia-500/10 blur-[150px] motion-reduce:hidden" />
                    <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[size:5rem_5rem]" />
                </div>

                <main className="relative z-10">
                    <Hero activeDrops={initialActiveDrops} />

                    <section
                        className="relative mx-auto w-full max-w-7xl px-4 pb-8 pt-4 sm:px-6 sm:pb-16 sm:pt-8 lg:px-8"
                        data-home-section="secondary"
                        data-home-density="compact-mobile-v1"
                        aria-labelledby="home-creator-spotlight-title"
                    >
                        <div className="relative mb-5 max-w-2xl rounded-[1.8rem] border border-white/8 bg-white/[0.025] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.15)] backdrop-blur-sm sm:mb-7 sm:p-6">
                            <div className="pointer-events-none absolute inset-y-4 left-0 w-px bg-gradient-to-b from-transparent via-brand-purple/70 to-transparent" aria-hidden="true" />
                            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-purple-200/80">
                                Meet the creators
                            </p>
                            <h2 id="home-creator-spotlight-title" className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
                                The people behind your next Drop.
                            </h2>
                            <p className="mt-3 max-w-xl text-sm leading-6 text-white/62 sm:text-base">
                                Follow the creators you want to keep up with, then explore their Drops as they go live.
                            </p>
                        </div>

                        <CreatorDiscoveryRail surface="home" initialCreators={initialCreators} />
                    </section>

                    <div
                        className="w-full"
                        data-home-section="third"
                        data-home-density="compact-mobile-v1"
                    >
                        <HowItWorks activeDrops={initialActiveDrops} />
                    </div>
                </main>

                <footer className="relative z-10 border-t border-white/10 bg-black/40 px-4 py-12 text-center text-sm text-gray-300 shadow-[0_-18px_54px_rgba(0,0,0,0.16)] backdrop-blur-xl">
                    <p>&copy; {new Date().getFullYear()} KandyDrops. All rights reserved.</p>
                </footer>
            </div>
        </>
    );
}
