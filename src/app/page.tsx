import { getDrops } from "@/lib/server/drops";
import { isDropActiveNow } from "@/lib/drop-status";
import Hero from "@/components/Hero";
import { HowItWorks } from "@/components/Landing/HowItWorks";
import { CreatorDiscoveryRail } from "@/components/CreatorDiscoveryRail";
import HomeClient from "./HomeClient";

export const dynamic = "force-dynamic";

export default async function HomePage() {
    const initialActiveDrops = (await getDrops()).filter((drop) => isDropActiveNow(drop));

    return (
        <>
            <HomeClient />
            <div
                className="relative min-h-screen bg-black pb-[calc(7.75rem+env(safe-area-inset-bottom))] md:pb-0"
                style={{ paddingTop: "var(--kandy-cookie-offset, 0px)" }}
            >
                <Hero activeDrops={initialActiveDrops} />

                <div
                    className="mx-auto mb-10 w-full max-w-7xl px-4 sm:mb-16 sm:px-6 lg:px-8"
                    style={{ contentVisibility: "auto", containIntrinsicSize: "560px" }}
                >
                    <CreatorDiscoveryRail surface="home" />
                </div>

                <div style={{ contentVisibility: "auto", containIntrinsicSize: "1120px" }}>
                    <HowItWorks activeDrops={initialActiveDrops} />
                </div>

                <footer className="border-t border-white/10 px-4 py-12 text-center text-sm text-gray-500">
                    <p>&copy; {new Date().getFullYear()} KandyDrops. All rights reserved.</p>
                </footer>
            </div>
        </>
    );
}
