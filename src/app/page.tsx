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
                className="relative min-h-screen bg-black pb-4 md:pb-0"
                data-home-modules-hydration="staged"
                style={{ paddingTop: "var(--kandy-cookie-offset, 0px)" }}
            >
                <Hero activeDrops={initialActiveDrops} />

                <div className="mx-auto mb-10 w-full max-w-7xl px-4 sm:mb-16 sm:px-6 lg:px-8">
                    <CreatorDiscoveryRail surface="home" initialCreators={initialCreators} />
                </div>

                <div className="w-full">
                    <HowItWorks activeDrops={initialActiveDrops} />
                </div>

                <footer className="border-t border-white/10 px-4 py-12 text-center text-sm text-gray-300">
                    <p>&copy; {new Date().getFullYear()} KandyDrops. All rights reserved.</p>
                </footer>
            </div>
        </>
    );
}
