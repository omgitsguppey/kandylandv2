import NextImage from "next/image";
import { ArrowUpRight } from "lucide-react";

import { Badge } from "@/components/creative-tim/ui/badge";
import { Card } from "@/components/creative-tim/ui/card";
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
            <Badge variant="outline" className={cn("absolute left-3 top-3 z-20 !rounded-md !border-white/10 !bg-black/60 !px-2 !py-0.5 !text-[10px] !font-bold uppercase tracking-widest !text-gray-300 backdrop-blur-md", !isAvailable && "!border-white/15 !bg-white/10 !text-white/70")}>
                {isAvailable ? "Ad" : "Unavailable"}
            </Badge>

            <div className="group/image relative mb-2 aspect-square w-full overflow-hidden rounded-xl bg-black/40 shadow-inner md:mb-5 md:rounded-2xl">
                <NextImage
                    src={coverSrc}
                    alt={drop.title}
                    fill
                    loading={imagePolicy.loading}
                    preload={imagePolicy.preload}
                    fetchPriority={imagePolicy.fetchPriority}
                    quality={imagePolicy.quality}
                    className={cn("bg-black object-contain opacity-90 transition-transform duration-700", isAvailable && "group-hover:scale-[1.03]")}
                    sizes={imagePolicy.sizes}
                    {...getImagePolicyDataAttributes(imagePolicy)}
                />

                {isAvailable ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 backdrop-blur-[2px] transition-opacity duration-300 group-hover:opacity-100">
                        <div className="scale-50 rounded-full bg-brand-purple p-3 text-white transition-transform duration-300 group-hover:scale-100">
                            <ArrowUpRight className="h-6 w-6" />
                        </div>
                    </div>
                ) : null}
            </div>

            <div className="relative z-10 flex flex-1 flex-col">
                <div className="mb-2 flex-1 md:mb-4">
                    <h3 className="mb-0.5 text-sm font-bold leading-tight tracking-tight text-white md:mb-1 md:text-xl">
                        {drop.title}
                    </h3>
                    <p className="line-clamp-2 text-[10px] font-medium leading-relaxed text-gray-400 md:text-sm">
                        {drop.description}
                    </p>
                </div>

                <div
                    className={cn(
                        "flex min-h-11 w-full items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition-opacity md:rounded-xl md:py-3 md:text-sm",
                        isAvailable ? "bg-brand-purple text-white" : "border border-white/10 bg-white/[0.06] text-white/60",
                    )}
                    style={isAvailable ? { backgroundColor: drop.accentColor || "#a476ff", color: "white" } : undefined}
                >
                    {isAvailable ? (
                        <>
                            {drop.ctaText || "Visit Now"}
                            <ArrowUpRight className="h-3 w-3 md:h-4 md:w-4" />
                        </>
                    ) : (
                        "Unavailable"
                    )}
                </div>
            </div>
        </>
    );

    return (
        <Card
            className="relative h-full overflow-hidden rounded-2xl border-white/10 bg-gradient-to-br from-white/5 to-white/0 !gap-0 !p-0 shadow-[0_12px_30px_rgba(0,0,0,0.2)] md:rounded-3xl"
            style={{
                borderColor: drop.accentColor ? `${drop.accentColor}40` : undefined,
            }}
        >
            {isAvailable && safeActionUrl ? (
                <a
                    href={safeActionUrl}
                    onClick={handleClick}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative flex h-full flex-col p-2 transition-all duration-500 md:p-6"
                >
                    {cardBody}
                </a>
            ) : (
                <div aria-disabled="true" className="relative flex h-full cursor-not-allowed flex-col p-2 opacity-80 md:p-6">
                    {cardBody}
                </div>
            )}
        </Card>
    );
}
