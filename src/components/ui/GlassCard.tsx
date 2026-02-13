import * as React from "react"
import { cn } from "@/lib/utils"

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
    hoverEffect?: boolean;
    intensity?: "low" | "medium" | "high";
}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
    ({ className, hoverEffect = false, intensity = "medium", children, ...props }, ref) => {

        const intensities = {
            low: "backdrop-blur-sm bg-white/5 border-white/5",
            medium: "glass-panel", // Uses our global CSS
            high: "backdrop-blur-3xl bg-white/10 border-white/20 shadow-2xl",
        }

        return (
            <div
                ref={ref}
                className={cn(
                    "rounded-3xl relative overflow-hidden",
                    intensity === "medium" ? "glass-panel" : intensities[intensity],
                    hoverEffect && "hover:bg-white/10 transition-colors cursor-pointer",
                    className
                )}
                {...props}
            >
                {children}
            </div>
        )
    }
)
GlassCard.displayName = "GlassCard"

export { GlassCard }
