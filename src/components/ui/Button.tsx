import * as React from "react"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "default" | "outline" | "ghost" | "glass" | "danger" | "brand";
    size?: "sm" | "default" | "lg" | "icon";
    isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "default", size = "default", isLoading, children, ...props }, ref) => {

        const variants = {
            default: "bg-white text-black hover:bg-zinc-200 shadow-lg shadow-white/10",
            outline: "border border-white/20 bg-transparent hover:bg-white/5 text-white",
            ghost: "hover:bg-white/10 text-gray-300 hover:text-white",
            glass: "glass-button text-white",
            danger: "bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20",
            brand: "bg-gradient-to-r from-brand-pink to-brand-purple text-white shadow-lg shadow-brand-pink/20 hover:opacity-90",
        }

        const sizes = {
            default: "h-11 px-5 py-2",
            sm: "h-9 px-3 text-xs",
            lg: "h-14 px-8 text-lg",
            icon: "h-10 w-10",
        }

        return (
            <button
                ref={ref}
                className={cn(
                    "inline-flex items-center justify-center rounded-xl text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 active:scale-95",
                    variants[variant],
                    sizes[size],
                    className
                )}
                disabled={isLoading || props.disabled}
                {...props}
            >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {children}
            </button>
        )
    }
)
Button.displayName = "Button"

export { Button }
