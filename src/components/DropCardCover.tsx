import { MediaImage } from "@/components/ui/media-image";
import { cn } from "@/lib/utils";
import { resolvePublicDropCoverSrc } from "@/lib/drop-media-fallback";
import { getImageLoadingPolicy, getImagePolicyDataAttributes } from "@/lib/image-loading-policy";
import type { SupportedAspectRatio } from "@/lib/drop-presentation";
import type { Drop } from "@/types/db";

export function DropCardCover({ drop, resolvedRatio, imageError, imageLoaded, shouldBlurCover, onLoad, onError }: {
    drop: Drop;
    resolvedRatio: SupportedAspectRatio;
    imageError: boolean;
    imageLoaded: boolean;
    shouldBlurCover: boolean;
    onLoad: () => void;
    onError: () => void;
}) {
    const coverSrc = imageError ? resolvePublicDropCoverSrc(null) : resolvePublicDropCoverSrc(drop.imageUrl);
    const hasProductCoverBlur = shouldBlurCover;
    const imagePolicy = getImageLoadingPolicy("drops_grid", {
        dropGridLayout: resolvedRatio === "16:9" ? "wide" : "standard",
        intrinsicLayout: true,
    });
    const imageTreatmentClassName = cn(
        imageLoaded ? "scale-100" : "scale-105 blur-md",
        imageLoaded && hasProductCoverBlur ? "blur-[10px] brightness-[0.72] saturate-[0.86]" : imageLoaded ? "blur-0" : null,
    );
    return (
        <>
            <MediaImage
                loaded={imageLoaded}
                src={coverSrc}
                alt={`${drop.title} public cover`}
                fill
                sizes={imagePolicy.sizes}
                preload={imagePolicy.preload}
                loading={imagePolicy.loading}
                fetchPriority={imagePolicy.fetchPriority}
                className={imageTreatmentClassName}
                onLoad={onLoad}
                onError={onError}
                {...getImagePolicyDataAttributes(imagePolicy)}
            />
            {imageLoaded && hasProductCoverBlur ? <div className="absolute inset-0 bg-scrim/22" aria-hidden="true" /> : null}
        </>
    );
}
