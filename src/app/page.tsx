import { isDropActiveNow } from "@/lib/drop-status";
import { getPublicDiscoveryData } from "@/lib/server/public-discovery-preview";
import { PublicHomeExperience } from "@/components/Landing/PublicHomeExperience";
import HomeClient from "./HomeClient";

export const dynamic = "force-dynamic";

export default async function HomePage() {
    const { drops, creatorProfiles: initialCreators } = await getPublicDiscoveryData("home");
    const initialActiveDrops = drops.filter((drop) => isDropActiveNow(drop));

    return (
        <>
            <HomeClient />
            <div
                className="min-h-screen overflow-x-clip bg-[#0a0a0b] pb-4 md:pb-0"
                data-home-modules-hydration="staged"
            >
                <main>
                    <PublicHomeExperience
                        activeDrops={initialActiveDrops}
                        initialCreators={initialCreators}
                    />
                </main>

                <footer className="border-t border-white/10 bg-[#0a0a0b] px-4 py-10 text-center text-sm text-gray-400 sm:py-12">
                    <p>&copy; {new Date().getFullYear()} KandyDrops. All rights reserved.</p>
                </footer>
            </div>
        </>
    );
}
