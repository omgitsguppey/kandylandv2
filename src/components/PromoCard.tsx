import { Drop } from "@/types/db";
import { authFetch } from "@/lib/authFetch";
import { auth } from "@/lib/firebase";
import { ArrowUpRight } from "lucide-react";

import NextImage from "next/image";
import { trackEvent } from "@/lib/telemetry";

interface PromoCardProps {
    drop: Drop;
}

const PROMO_CARD_URL_BASE = "https://kandydrops.invalid";
const ALLOWED_PROMO_CARD_PROTOCOLS = new Set(["http:", "https:"]);

export function getSafeUrl(url: string | undefined): string | undefined {
    const trimmedUrl = url?.trim();
    if (!trimmedUrl) return undefined;

    const normalizedSchemeCheck = trimmedUrl.replace(/[\u0000-\u001F\u007F\s]+/g, "");
    if (/^(javascript|data|vbscript):/i.test(normalizedSchemeCheck)) {
        return undefined;
    }

    try {
        const parsed = new URL(trimmedUrl, PROMO_CARD_URL_BASE);
        if (!ALLOWED_PROMO_CARD_PROTOCOLS.has(parsed.protocol)) {
            return undefined;
        }

        if (parsed.origin === PROMO_CARD_URL_BASE) {
            if (parsed.pathname.startsWith("//") || parsed.pathname.startsWith("/\\")) {
                return undefined;
            }
            return `${parsed.pathname}${parsed.search}${parsed.hash}`;
        }
        return parsed.toString();
    } catch {
        return undefined;
    }
}

export function PromoCard({ drop }: PromoCardProps) {
    const handleClick = () => {
        trackEvent("promo_card_clicked", {
            drop_id: drop.id,
            action_url: drop.actionUrl,
            drop_category: drop.type,
        });

        const endpoint = `/api/drops/${encodeURIComponent(drop.id)}/click`;

        // Track click server-side (fire-and-forget)
        const request = auth?.currentUser
            ? authFetch(endpoint, {
                method: "POST",
                keepalive: true,
            })
            : fetch(endpoint, {
                method: "POST",
                keepalive: true,
                credentials: "same-origin",
            });

        request.catch(() => { });
    };

    return (
        <a
            href={getSafeUrl(drop.actionUrl)}
            onClick={handleClick}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative p-2 md:p-6 rounded-2xl md:rounded-3xl glass-panel transition-all duration-500 overflow-hidden flex flex-col h-full bg-gradient-to-br from-white/5 to-white/0 border border-white/10"
            style={{
                borderColor: drop.accentColor ? `${drop.accentColor}40` : undefined
            }}
        >
            {/* Promo Label */}
            <div className="absolute top-3 left-3 z-20 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold text-gray-300 uppercase tracking-widest border border-white/10">
                Ad
            </div>

            {/* Image Container */}
            <div className="relative w-full aspect-square bg-black/40 rounded-xl md:rounded-2xl mb-2 md:mb-5 overflow-hidden group/image shadow-inner">
                {drop.imageUrl ? (
                    <NextImage
                        src={drop.imageUrl}
                        alt={drop.title}
                        fill
                        className="object-contain bg-black transition-transform duration-700 opacity-90"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                ) : (
                    <div className="w-full h-full bg-zinc-900" />
                )}

                {/* Overlay Icon */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 bg-black/20 backdrop-blur-[2px]">
                    <div className="rounded-full bg-brand-purple p-3 text-white transform scale-50 transition-transform duration-300">
                        <ArrowUpRight className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="relative z-10 flex-1 flex flex-col">
                <div className="mb-2 md:mb-4 flex-1">
                    <h3 className="text-sm md:text-xl font-bold text-white mb-0.5 md:mb-1 leading-tight tracking-tight transition-colors">
                        {drop.title}
                    </h3>
                    <p className="text-[10px] md:text-sm text-gray-400 line-clamp-2 font-medium leading-relaxed">
                        {drop.description}
                    </p>
                </div>

                <div
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-purple py-2 text-xs font-bold text-white transition-opacity md:rounded-xl md:py-3 md:text-sm"
                    style={{
                        backgroundColor: drop.accentColor || "#a476ff",
                        color: "white",
                    }}
                >
                    {drop.ctaText || "Visit Now"}
                    <ArrowUpRight className="w-3 h-3 md:w-4 md:h-4" />
                </div>
            </div>
        </a>
    );
}
