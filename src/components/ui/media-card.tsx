import type { ComponentProps, CSSProperties, ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

/** Presentation slots only: callers own media access, actions, state and telemetry. */
export function MediaCard({ cover, title, description, children, footer, ...props }: ComponentProps<"article"> & {
    cover: ReactNode;
    title: ReactNode;
    description?: ReactNode;
    footer?: ReactNode;
}) {
    return (
        <article {...props} className={cn("h-full min-w-0", props.className)}>
            <Card className="h-full gap-0 overflow-hidden py-0">
                {cover}
                <CardContent className="flex min-w-0 flex-1 flex-col gap-4 p-5">
                    <h3 className="text-xl font-semibold leading-snug tracking-tight [overflow-wrap:anywhere]">{title}</h3>
                    {description ? <p className="text-sm leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">{description}</p> : null}
                    {children}
                    {footer ? <div className="mt-auto space-y-4 pt-2">{footer}</div> : null}
                </CardContent>
            </Card>
        </article>
    );
}

export function MediaPreview({ className, style, ...props }: ComponentProps<"button"> & { style?: CSSProperties }) {
    return <button type="button" {...props} style={style} className={cn(buttonVariants({ variant: "ghost" }), "relative block min-h-11 w-full overflow-hidden rounded-none bg-muted p-0 text-left focus-visible:ring-inset focus-visible:ring-offset-0", className)} />;
}
