import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-full text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:opacity-80 motion-reduce:transition-none",
  {
    variants: {
      variant: {
        default: "bg-foreground text-background hover:bg-foreground/90",
        outline: "border border-input bg-transparent text-foreground hover:bg-secondary",
        ghost: "text-muted-foreground hover:bg-secondary hover:text-foreground",
        glass: "glass-button text-foreground hover:bg-popover",
        danger: "border border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20",
        brand: "bg-primary text-primary-foreground hover:bg-primary/90",
      },
      size: {
        default: "min-h-11 px-5 py-2",
        sm: "min-h-11 px-3 py-2 text-sm",
        lg: "min-h-14 px-8 py-3 text-lg",
        icon: "min-h-11 min-w-11 p-2",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
      disabled={isLoading || props.disabled}
      aria-busy={isLoading || props["aria-busy"]}
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
      {children}
    </button>
  ),
);
Button.displayName = "Button";

export { Button, buttonVariants };
