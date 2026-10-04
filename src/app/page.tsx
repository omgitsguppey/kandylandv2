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
            <div className="bg-background text-foreground" data-home-modules-hydration="staged">
                <PublicHomeExperience
                    activeDrops={initialActiveDrops}
                    initialCreators={initialCreators}
                />

                <footer className="border-t border-border px-4 py-8 text-center text-sm text-muted-foreground sm:py-10">
                    <p>&copy; {new Date().getFullYear()} KandyDrops. All rights reserved.</p>
                </footer>
            </div>
        </>
    );
}
