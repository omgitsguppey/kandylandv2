import { useRef } from "react";
import { Button } from "@/components/ui/Button";
import { CandyIcon } from "@/components/ui/Icon";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";

export default function Hero() {
    const { user } = useAuth();
    const { openAuthModal } = useUI();
    const ref = useRef(null);

    return (
        <section ref={ref} className="relative min-h-[60vh] md:min-h-[90vh] flex items-center justify-center overflow-hidden py-12 md:py-0">
            {/* Background Gradients (True Black Theme) */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-brand-purple/20 rounded-full blur-[120px] opacity-40"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-brand-pink/10 rounded-full blur-[120px] opacity-30"></div>
            </div>

            {/* Parallax Content */}
            <div className="relative z-10 text-center w-full max-w-7xl mx-auto px-4 md:px-8">
                <div className="mb-4 md:mb-8 flex justify-center">
                    <div className="p-4 md:p-8 relative">
                        <div className="absolute inset-0 bg-white/5 rounded-full blur-3xl"></div>
                        <CandyIcon size="xl" className="drop-shadow-[0_0_30px_rgba(255,255,255,0.3)] scale-75 md:scale-100" />
                    </div>
                </div>

                <h1 className="text-4xl md:text-8xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 mb-3 md:mb-6">
                    KandyDrops
                </h1>

                <p className="text-base md:text-2xl text-gray-400 font-medium max-w-xl md:max-w-3xl mx-auto mb-6 md:mb-10 leading-relaxed">
                    <span className="flex items-center gap-2 text-sm md:text-base font-medium tracking-wide justify-center">
                        <span className="w-2 h-2 rounded-full bg-brand-green" />
                        <span className="text-white">Collect. Unwrap. Own the moment.</span>
                    </span>
                </p>


                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    {user ? (
                        <Link href="/dashboard">
                            <Button size="lg" variant="brand" className="rounded-full px-8 py-3 w-full sm:w-auto text-base md:text-lg shadow-[0_0_40px_rgba(236,72,153,0.3)]">
                                Unwrap Now
                            </Button>
                        </Link>
                    ) : (
                        <Button
                            onClick={openAuthModal}
                            size="lg"
                            variant="brand"
                            className="rounded-full px-8 py-3 w-full sm:w-auto text-base md:text-lg shadow-[0_0_40px_rgba(236,72,153,0.3)]"
                        >
                            Unwrap Now
                        </Button>
                    )}
                    <Button size="lg" variant="glass" className="rounded-full px-8 py-3 w-full sm:w-auto text-base md:text-lg hover:bg-white/10">
                        What&apos;s a KandyDrop?
                    </Button>
                </div>
            </div>

        </section>
    );
}
