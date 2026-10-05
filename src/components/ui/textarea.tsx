import * as React from "react";
import { cn } from "@/lib/utils";

/** Shared multiline input; callers own validation, drafts and submission. */
export const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
    ({ className, ...props }, ref) => (
        <textarea
            ref={ref}
            className={cn("min-h-11 w-full min-w-0 rounded-xl border border-input bg-input/30 px-3 py-3 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 md:text-sm", className)}
            {...props}
        />
    ),
);
Textarea.displayName = "Textarea";
