"use client";

import { useUI } from "@/context/UIContext";
import { Lock, Eye, Heart, Zap } from "lucide-react";
import { EditableImage } from "@/components/Admin/EditableImage";
import { useDrops } from "@/hooks/useDrops";

export function HowItWorks() {
    const { openAuthModal } = useUI();
    const { drops } = useDrops();

    const curatedImages = [
        drops[0]?.imageUrl || "/placeholder-square.jpg",
        drops[1]?.imageUrl || "/placeholder-square.jpg",
        drops[2]?.imageUrl || "/placeholder-square.jpg",
        drops[3]?.imageUrl || "/placeholder-square.jpg",
    ];

    const features = [
        {
            icon: <Lock className="w-8 h-8 text-brand-purple" />,
            title: "Discover Exclusives",
            description: "Find private drops from top creators that are securely locked away."
        },
        {
            icon: <Zap className="w-8 h-8 text-brand-purple" />,
            title: "Get Gum Drops",
            description: "Load up your wallet with our sitewide currency, Gum Drops."
        },
        {
            icon: <Eye className="w-8 h-8 text-brand-purple" />,
            title: "Unwrap Access",
            description: "Spend your GD to instantly unlock full access to the hidden media permanently."
        },
        {
            icon: <Heart className="w-8 h-8 text-brand-purple" />,
            title: "Own the Experience",
            description: "Once unwrapped, it's in your library forever. Re-experience it anytime."
        }
    ];

    return (
        <section className="py-24 bg-black relative border-t border-white/5">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#b28cff05_1px,transparent_1px),linear-gradient(to_bottom,#b28cff05_1px,transparent_1px)] bg-[size:4rem_4rem]" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6">How the Drops Work</h2>
                    <p className="text-lg text-gray-400">Straightforward access to premium digital collections.</p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
                    {features.map((f, i) => (
                        <div key={i} className="bg-zinc-950 border border-white/5 rounded-3xl p-8 hover:bg-zinc-900 transition-colors group">
                            <div className="w-16 h-16 rounded-2xl bg-brand-purple/10 flex items-center justify-center mb-6 border border-brand-purple/20 group-hover:scale-110 transition-transform">
                                {f.icon}
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3">{f.title}</h3>
                            <p className="text-gray-400 leading-relaxed text-sm">{f.description}</p>
                        </div>
                    ))}
                </div>

                {/* Creator Showcase Grid */}
                <div className="bg-zinc-900 rounded-[3rem] p-8 md:p-12 border border-brand-purple/10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-brand-purple/10 blur-[100px] rounded-full" />
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-brand-purple/5 blur-[100px] rounded-full" />

                    <div className="grid md:grid-cols-2 gap-12 items-center relative z-10">
                        <div className="space-y-6">
                            <h3 className="text-3xl md:text-4xl font-extrabold text-white">Curated by top-tier talent.</h3>
                            <p className="text-gray-400 text-lg leading-relaxed">
                                Our platform is home to creators who push boundaries. Discover the unseen side of <span className="text-brand-purple font-bold">Jessi Ray</span> and the exclusive archives of <span className="text-brand-purple font-bold">Bloomytrip</span>, available only right here on KandyDrops.
                            </p>
                            <button onClick={openAuthModal} className="mt-4 px-8 py-4 bg-white hover:bg-gray-200 text-black font-extrabold rounded-xl transition-colors">
                                Browse the Catalog
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-4">
                                <EditableImage
                                    id="landing-hero-1"
                                    defaultSrc={curatedImages[0]}
                                    alt="Creator content"
                                    fill
                                    sizes="(max-width: 768px) 50vw, 25vw"
                                    className="relative w-full aspect-[4/5] rounded-3xl overflow-hidden border border-white/10 bg-zinc-900"
                                />
                                <EditableImage
                                    id="landing-hero-2"
                                    defaultSrc={curatedImages[1]}
                                    alt="Creator content"
                                    fill
                                    sizes="(max-width: 768px) 50vw, 25vw"
                                    className="relative w-full aspect-square rounded-3xl overflow-hidden border border-white/10 bg-zinc-900"
                                />
                            </div>
                            <div className="space-y-4 mt-8">
                                <EditableImage
                                    id="landing-hero-3"
                                    defaultSrc={curatedImages[2]}
                                    alt="Creator content"
                                    fill
                                    sizes="(max-width: 768px) 50vw, 25vw"
                                    className="relative w-full aspect-square rounded-3xl overflow-hidden border border-white/10 bg-zinc-900"
                                />
                                <EditableImage
                                    id="landing-hero-4"
                                    defaultSrc={curatedImages[3]}
                                    alt="Creator content"
                                    fill
                                    sizes="(max-width: 768px) 50vw, 25vw"
                                    className="relative w-full aspect-[4/5] rounded-3xl overflow-hidden border border-white/10 bg-zinc-900"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
