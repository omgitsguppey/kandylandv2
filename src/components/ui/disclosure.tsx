import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Native disclosure: evidence remains in the DOM with caller-owned open state. */
export function Disclosure({ className, ...props }: ComponentProps<"details">) {
    return <details className={cn("min-w-0 text-sm text-foreground", className)} {...props} />;
}

export function DisclosureSummary({ className, ...props }: ComponentProps<"summary">) {
    return <summary className={cn("min-h-11 cursor-pointer py-3 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)} {...props} />;
}
