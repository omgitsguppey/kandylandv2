"use client";

/* SPDX-License-Identifier: MIT
 * Adapted from shadcn/ui's official new-york-v4 Dialog registry component.
 * Copyright (c) 2023 shadcn; full notice is retained in this directory's LICENSE.md.
 * Source: https://ui.shadcn.com/r/styles/new-york-v4/dialog.json
 * Installed Radix imports, shared Button and bounded viewport sizing are local adaptations.
 */
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

function Dialog(props: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root {...props} />;
}

function DialogTrigger(props: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal(props: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal {...props} />;
}

function DialogClose(props: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn("fixed inset-0 z-[60] bg-black/60", className)}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { showCloseButton?: boolean }) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "fixed left-1/2 top-1/2 z-[70] grid w-full max-w-[calc(100%-2rem)] max-h-[calc(100dvh-2rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-2xl border border-border bg-popover p-6 text-foreground shadow-lg outline-none sm:max-w-lg",
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close asChild>
            <Button variant="ghost" size="icon" className="absolute right-2 top-2" aria-label="Close">
              <XIcon aria-hidden="true" className="h-4 w-4" />
            </Button>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="dialog-header" className={cn("flex flex-col gap-2 text-center sm:text-left", className)} {...props} />;
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="dialog-footer" className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />;
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title data-slot="dialog-title" className={cn("text-lg font-semibold leading-tight", className)} {...props} />;
}

function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description data-slot="dialog-description" className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

// Existing anchored notification and edge account surfaces compose the same Radix owner
// without inheriting the centered modal presentation above.
const DialogPrimitiveContent = DialogPrimitive.Content;

export {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogOverlay, DialogPortal, DialogPrimitiveContent, DialogTitle, DialogTrigger,
};
