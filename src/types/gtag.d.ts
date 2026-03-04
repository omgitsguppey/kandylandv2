/**
 * Global type augmentation for Google Analytics gtag.
 * Allows `window.gtag(...)` calls without `as any` casts.
 */

type GtagCommand = "config" | "set" | "event" | "js" | "consent";

interface GtagEventParams {
    [key: string]: string | number | boolean | undefined;
}

interface Window {
    gtag?: (
        command: GtagCommand,
        targetOrAction: string,
        params?: GtagEventParams
    ) => void;
    dataLayer?: Array<Record<string, unknown>>;
}
