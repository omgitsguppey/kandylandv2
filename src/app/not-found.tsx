import { KandyNotFoundStateSurface } from "@/components/creative-tim/kandydrops/app-states/KandyNotFoundStateSurface";
import { NOT_FOUND_COPY, NOT_FOUND_RETURN_HREF } from "@/components/ui/NotFoundSurface";

export default function NotFound() {
    return (
        <KandyNotFoundStateSurface
            eyebrow={NOT_FOUND_COPY.eyebrow}
            title={NOT_FOUND_COPY.title}
            detail={NOT_FOUND_COPY.detail}
            returnHref={NOT_FOUND_RETURN_HREF}
        />
    );
}
