import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Keep native table semantics and the caller's source/loading states. */
export function DataTable({ className, ...props }: ComponentProps<"table">) {
    return <table className={cn("w-full text-left text-sm text-foreground", className)} {...props} />;
}

/** Scroll only the records, never the workspace or its action controls. */
export function TableScrollArea({ className, ...props }: ComponentProps<"div">) {
    return <div className={cn("min-w-0 max-w-full overflow-x-auto", className)} {...props} />;
}
