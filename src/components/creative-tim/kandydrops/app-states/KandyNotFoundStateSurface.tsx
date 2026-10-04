import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

interface KandyNotFoundStateSurfaceProps {
    eyebrow: string;
    title: string;
    detail: string;
    returnHref: string;
}

export function KandyNotFoundStateSurface({
    eyebrow,
    title,
    detail,
    returnHref,
}: KandyNotFoundStateSurfaceProps) {
    return (
        <main
            className="relative flex min-h-[calc(100dvh-8rem)] items-center justify-center overflow-hidden bg-[#08040f] px-4 py-12 text-center text-white"
            data-not-found-return-href={returnHref}
            data-old-not-found-logo-removed="true"
        >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_14%,rgba(178,140,255,0.24),transparent_25%),radial-gradient(circle_at_86%_84%,rgba(255,111,207,0.15),transparent_26%),linear-gradient(155deg,rgba(18,7,30,0.94),rgba(5,3,10,0.98))]" aria-hidden="true" />
            <section className="relative w-full max-w-xl overflow-hidden rounded-[2rem] border border-white/10 bg-black/30 px-5 py-9 shadow-[0_28px_90px_rgba(0,0,0,0.4)] backdrop-blur-xl sm:px-8 sm:py-12 md:rounded-[2.5rem]">
                <div className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-brand-purple/70 to-transparent" aria-hidden="true" />
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.35rem] border border-brand-purple/30 bg-brand-purple/12 text-brand-purple shadow-[0_14px_34px_rgba(164,118,255,0.15)]">
                    <Sparkles className="h-7 w-7" aria-hidden="true" />
                </div>
                <p className="mt-6 text-[10px] font-black uppercase tracking-[0.24em] text-brand-purple">{eyebrow}</p>
                <h1 className="mt-3 text-3xl font-black leading-[1.01] tracking-[-0.05em] text-white sm:text-5xl">{title}</h1>
                <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-gray-300 sm:text-base sm:leading-7">{detail}</p>
                <Link
                    href={returnHref}
                    className="mt-8 inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-brand-purple/55 bg-[linear-gradient(110deg,rgba(178,140,255,0.94),rgba(120,74,222,0.96))] px-5 text-sm font-black text-white shadow-[0_14px_32px_rgba(164,118,255,0.22)] transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple/70"
                >
                    Return to App
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
            </section>
        </main>
    );
}
