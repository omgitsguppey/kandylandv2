import NextImage from "next/image";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function MediaImage({ loaded, children, className, ...props }: ComponentProps<typeof NextImage> & {
    loaded: boolean;
    children?: ReactNode;
}) {
    return <>
        <NextImage {...props} className={cn("bg-muted object-cover object-center transition-all duration-700 motion-reduce:transition-none", className)} />
        {children}
        {!loaded ? <div className="absolute inset-0 animate-pulse bg-muted motion-reduce:animate-none" aria-hidden="true" /> : null}
    </>;
}
