import NextImage from "next/image";
import { ArrowUpRight, Sparkles } from "lucide-react";

import { authFetch } from "@/lib/authFetch";
import { auth } from "@/lib/firebase";
import { resolvePublicDropCoverSrc } from "@/lib/drop-media-fallback";
import { getImageLoadingPolicy, getImagePolicyDataAttributes } from "@/lib/image-loading-policy";
import { resolveDropLifecycleStatus } from "@/lib/drop-status";
import { trackEvent } from "@/lib/telemetry";
import { cn } from "@/lib/utils";
import { Drop } from "@/types/db";

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
    if (trimmedUrl.startsWith("\\") || trimmedUrl.startsWith("//") || trimmedUrl.startsWith("/\\")) {
        return undefined;
    }

    try {
        const parsed = new URL(trimmedUrl, PROMO_CARD_URL_BASE);
        if (!ALLOWED_PROMO_CARD_PROTOCOLS.has(parsed.protocol)) {
            return undefined;
        }

        if (parsed.origin === PROMO_CARD_URL_BASE) {
            if (
                parsed.pathname.startsWith("//")
                || parsed.pathname.startsWith("/\\")
                || parsed.pathname.startsWith("\\")
                || trimmedUrl.startsWith("\\")
                || trimmedUrl.startsWith("//")
                || trimmedUrl.startsWith("/\\")
            ) {
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
    const imagePolicy = getImageLoadingPolicy("drops_grid");
    const safeActionUrl = getSafeUrl(drop.actionUrl);
    const isPubliclyLive = resolveDropLifecycleStatus(drop, { audience: "public" }).publicVisible;
    const isAvailable = Boolean(isPubliclyLive && safeActionUrl);
    const coverSrc = resolvePublicDropCoverSrc(drop.imageUrl);

    const handleClick = () => {
        if (!isAvailable || !safeActionUrl) {
            return;
        }

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

    const cardBody = (
        <>
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-black">
                    <NextImage
                        src={coverSrc}
                        alt={drop.title}
                        fill
                        loading={imagePolicy.loading}
                        preload={imagePolicy.preload}
                        fetchPriority={imagePolicy.fetchPriority}
                        quality={imagePolicy.quality}
                        className={cn("bg-black object-contain opacity-95 transition-transform duration-700", isAvailable && "group-hover:scale-[1.04]")}
                        sizes={imagePolicy.sizes}
                        {...getImagePolicyDataAttributes(imagePolicy)}
                    />
                    <div className="absolute inset-0 bg-black/30" />
                    <div className="absolute left-3 top-3 flex items-center gap-1.5">
                        <span className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.15em]",
                            isAvailable
                                ? "border-brand-purple/40 bg-brand-purple/15 text-[#efe8ff]"
                                : "border-white/15 bg-black/55 text-white/60",
                        )}>
                            <Sparkles className="h-3 w-3" aria-hidden="true" />
                            {isAvailable ? "Partner drop" : "Unavailable"}
                        </span>
                    </div>
                    {isAvailable ? (
                        <div className="absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/70 text-white transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                        </div>
                    ) : null}
            </div>

            <div className="relative flex flex-1 flex-col p-3 sm:p-4">
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-brand-purple">Partner KandyDrop</p>
                <h3 className="mt-2 text-base font-black leading-[1.04] tracking-[-0.025em] text-white sm:text-lg">{drop.title}</h3>
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-gray-400 sm:text-sm">{drop.description}</p>
                <div
                    className={cn(
                        "mt-auto flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border px-4 py-2 text-xs font-black transition-colors sm:text-sm",
                        isAvailable
                            ? "border-brand-purple/45 bg-brand-purple/15 text-white group-hover:bg-brand-purple/23"
                            : "border-white/10 bg-white/[0.04] text-white/50",
                    )}
                >
                    {isAvailable ? (
                        <>
                            {drop.ctaText || "Visit Now"}
                            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                        </>
                    ) : (
                        "Unavailable"
                    )}
                </div>
            </div>
        </>
    );

    return (
        <article
            className="group relative h-full overflow-hidden rounded-2xl border border-white/[0.09] bg-[#121214] transition-colors duration-300 hover:border-brand-purple/45"
            data-promo-card-layout="creative-tim-editorial"
            data-promo-card-available={isAvailable}
        >
            {isAvailable && safeActionUrl ? (
                <a
                    href={safeActionUrl}
                    onClick={handleClick}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative flex h-full flex-col"
                >
                    {cardBody}
                </a>
            ) : (
                <div aria-disabled="true" className="relative flex h-full cursor-not-allowed flex-col opacity-75">
                    {cardBody}
                </div>
            )}
        </article>
    );
}
