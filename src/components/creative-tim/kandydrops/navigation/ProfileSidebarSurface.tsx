"use client";

import { useRef, type ReactNode } from "react";
import {
  Dialog, DialogOverlay, DialogPortal, DialogPrimitiveContent, DialogTitle, DialogDescription,
} from "@/components/creative-tim/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/Button";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, LogOut, Plus, Sparkles, X } from "lucide-react";

export interface ProfileSidebarNavigationItem {
  href: string;
  icon: ReactNode;
  label: string;
  hasUnreadIndicator?: boolean;
}

export interface ProfileSidebarNavigationSection {
  label: string;
  items: ProfileSidebarNavigationItem[];
}

interface ProfileSidebarSurfaceProps {
  isOpen: boolean;
  avatarUrl: string | null;
  profileInitial: string;
  primaryIdentity: string;
  secondaryIdentity: string;
  isAdmin: boolean;
  gumDropsBalance: string;
  navigationSections: ProfileSidebarNavigationSection[];
  onClose: () => void;
  onLogout: () => void;
  onPurchase: () => void;
  onNavigate: (destination: string) => void;
}

export function ProfileSidebarSurface({
  isOpen,
  avatarUrl,
  profileInitial,
  primaryIdentity,
  secondaryIdentity,
  isAdmin,
  gumDropsBalance,
  navigationSections,
  onClose,
  onLogout,
  onPurchase,
  onNavigate,
}: ProfileSidebarSurfaceProps) {
  const returnFocusRef = useRef<HTMLElement | null>(null);
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogPortal>
      <DialogOverlay />
      <DialogPrimitiveContent
        aria-modal="true"
        className="fixed inset-y-0 right-0 z-[70] flex h-[100dvh] w-full max-w-md flex-col overflow-hidden border-l border-border bg-popover text-foreground shadow-lg"
        onOpenAutoFocus={() => {
          const invoker = document.activeElement;
          if (invoker instanceof HTMLElement && invoker !== document.body) returnFocusRef.current = invoker;
        }}
        onCloseAutoFocus={(event) => {
          if (returnFocusRef.current?.isConnected) {
            event.preventDefault();
            returnFocusRef.current.focus();
          }
        }}
      >
        <DialogTitle className="sr-only">KandyDrops account menu</DialogTitle>
        <DialogDescription className="sr-only">Your account</DialogDescription>

        <header className="relative flex items-start justify-between gap-4 px-5 pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden="true"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-secondary text-primary"
            >
              <Sparkles className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold tracking-wide text-foreground">
                KandyDrops
              </p>
              <p className="text-sm text-muted-foreground">Your account</p>
            </div>
          </div>
          <Button variant="ghost" size="icon"
            type="button"
            aria-label="Close account menu"
            className="shrink-0"
            onClick={onClose}
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </Button>
        </header>

        <section className="relative mx-4 mt-5 rounded-3xl border border-border bg-card p-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-secondary text-lg font-semibold text-foreground">
              {avatarUrl ? (
                <Image
                  fill
                  alt={`${primaryIdentity} profile photo`}
                  className="object-cover"
                  sizes="56px"
                  src={avatarUrl}
                />
              ) : (
                <span>{profileInitial}</span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <p className="truncate text-sm font-semibold text-foreground" title={primaryIdentity}>
                  {primaryIdentity}
                </p>
                {isAdmin ? (
                  <span className="shrink-0 rounded-full border border-border bg-secondary px-2 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
                    Admin
                  </span>
                ) : null}
              </div>
              <p className="truncate text-sm text-muted-foreground" title={secondaryIdentity}>
                {secondaryIdentity}
              </p>
            </div>
          </div>
        </section>

        <div className="relative mx-4 mt-3">
          <Button variant="outline"
            type="button"
            aria-label="Buy more GumDrops"
            className="group min-h-14 w-full justify-between gap-4 rounded-2xl bg-card px-4 py-3 text-left"
            onClick={onPurchase}
          >
            <span className="min-w-0">
              <span className="block text-sm text-muted-foreground">GumDrops</span>
              <span className="block truncate text-lg font-bold text-foreground">
                {gumDropsBalance}
              </span>
            </span>
            <span
              aria-hidden="true"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-foreground transition group-hover:bg-popover motion-reduce:transition-none"
            >
              <Plus className="h-5 w-5" />
            </span>
          </Button>
        </div>

        <nav
          aria-label="Account navigation"
          className="relative mt-5 flex-1 overflow-y-auto px-4 pb-5"
        >
          <div className="space-y-5">
            {navigationSections.map((section, sectionIndex) => {
              const headingId = `profile-sidebar-section-${sectionIndex}`;

              return (
                <section aria-labelledby={headingId} key={section.label}>
                  <p
                    className="px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    id={headingId}
                  >
                    {section.label}
                  </p>
                  <div className="mt-2 space-y-1">
                    {section.items.map((item) => (
                      <Link
                        className={buttonVariants({ variant: "ghost", className: "group w-full justify-start gap-3 rounded-2xl text-foreground" })}
                        href={item.href}
                        key={item.href}
                        onClick={() => onNavigate(item.href)}
                      >
                        <span
                          aria-hidden="true"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary text-primary transition group-hover:border-border group-hover:bg-secondary motion-reduce:transition-none"
                        >
                          {item.icon}
                        </span>
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        {item.hasUnreadIndicator ? (
                          <span
                            aria-label="Unread messages"
                            className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary"
                            role="status"
                          />
                        ) : null}
                        <ChevronRight
                          aria-hidden="true"
                          className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary motion-reduce:transition-none"
                        />
                      </Link>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </nav>

        <footer className="relative border-t border-border px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          <Button variant="danger"
            type="button"
            className="w-full justify-start gap-3 rounded-2xl"
            onClick={onLogout}
          >
            <span
              aria-hidden="true"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-secondary"
            >
              <LogOut className="h-5 w-5" />
            </span>
            Sign out
          </Button>
        </footer>
      </DialogPrimitiveContent>
      </DialogPortal>
    </Dialog>
  );
}
