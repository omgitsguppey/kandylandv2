"use client";

import type { ReactNode } from "react";
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
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      data-state={isOpen ? "open" : "closed"}
    >
      <button
        type="button"
        aria-label="Close account menu"
        className="absolute inset-0 cursor-default bg-slate-950/75 backdrop-blur-sm transition-opacity motion-reduce:transition-none"
        onClick={onClose}
      />

      <aside
        aria-label="KandyDrops account menu"
        aria-modal={isOpen}
        className="relative flex h-[100dvh] w-full max-w-md flex-col overflow-hidden rounded-l-3xl border-l border-fuchsia-200/15 bg-gradient-to-b from-[#1c1038] via-[#120921] to-[#090611] text-white shadow-2xl shadow-fuchsia-950/50"
        role="dialog"
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-fuchsia-500/25 blur-3xl" />
          <div className="absolute -left-20 top-1/3 h-48 w-48 rounded-full bg-purple-500/20 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-40 w-40 rounded-full bg-rose-400/10 blur-3xl" />
        </div>

        <header className="relative flex items-start justify-between gap-4 px-5 pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden="true"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-fuchsia-200/25 bg-fuchsia-400/15 text-fuchsia-100 shadow-lg shadow-fuchsia-950/30"
            >
              <Sparkles className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold tracking-wide text-white">
                KandyDrops
              </p>
              <p className="text-sm text-fuchsia-100/70">Your account</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close account menu"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition hover:border-fuchsia-200/35 hover:bg-fuchsia-400/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#120921] motion-reduce:transition-none"
            onClick={onClose}
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </header>

        <section className="relative mx-4 mt-5 rounded-3xl border border-white/10 bg-white/[0.07] p-4 shadow-xl shadow-black/20 backdrop-blur-xl">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-fuchsia-100/25 bg-gradient-to-br from-fuchsia-400/35 to-purple-500/35 text-lg font-bold text-white shadow-lg shadow-fuchsia-950/30">
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
                <p className="truncate text-sm font-semibold text-white" title={primaryIdentity}>
                  {primaryIdentity}
                </p>
                {isAdmin ? (
                  <span className="shrink-0 rounded-full border border-fuchsia-200/30 bg-fuchsia-300/15 px-2 py-1 text-xs font-semibold uppercase tracking-wider text-fuchsia-100">
                    Admin
                  </span>
                ) : null}
              </div>
              <p className="truncate text-sm text-fuchsia-100/70" title={secondaryIdentity}>
                {secondaryIdentity}
              </p>
            </div>
          </div>
        </section>

        <div className="relative mx-4 mt-3">
          <button
            type="button"
            aria-label="Buy more GumDrops"
            className="group flex min-h-14 w-full items-center justify-between gap-4 rounded-3xl border border-fuchsia-200/20 bg-gradient-to-r from-fuchsia-500/20 via-purple-500/15 to-rose-400/15 px-4 py-3 text-left shadow-lg shadow-fuchsia-950/20 transition hover:border-fuchsia-100/45 hover:from-fuchsia-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#120921] motion-reduce:transition-none"
            onClick={onPurchase}
          >
            <span className="min-w-0">
              <span className="block text-sm text-fuchsia-100/75">GumDrops</span>
              <span className="block truncate text-lg font-bold text-white">
                {gumDropsBalance}
              </span>
            </span>
            <span
              aria-hidden="true"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-fuchsia-50 transition group-hover:bg-white/25 motion-reduce:transition-none"
            >
              <Plus className="h-5 w-5" />
            </span>
          </button>
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
                    className="px-2 text-xs font-semibold uppercase tracking-wider text-fuchsia-100/55"
                    id={headingId}
                  >
                    {section.label}
                  </p>
                  <div className="mt-2 space-y-1">
                    {section.items.map((item) => (
                      <Link
                        className="group flex min-h-11 items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium text-fuchsia-50/85 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#120921] motion-reduce:transition-none"
                        href={item.href}
                        key={item.href}
                        onClick={() => onNavigate(item.href)}
                      >
                        <span
                          aria-hidden="true"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-fuchsia-100 transition group-hover:border-fuchsia-200/25 group-hover:bg-fuchsia-400/15 motion-reduce:transition-none"
                        >
                          {item.icon}
                        </span>
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        {item.hasUnreadIndicator ? (
                          <span
                            aria-label="Unread messages"
                            className="h-2.5 w-2.5 shrink-0 rounded-full bg-rose-300 shadow-sm shadow-rose-200/80"
                            role="status"
                          />
                        ) : null}
                        <ChevronRight
                          aria-hidden="true"
                          className="h-4 w-4 shrink-0 text-fuchsia-100/40 transition group-hover:translate-x-0.5 group-hover:text-fuchsia-100 motion-reduce:transition-none"
                        />
                      </Link>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </nav>

        <footer className="relative border-t border-white/10 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          <button
            type="button"
            className="flex min-h-11 w-full items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold text-fuchsia-100/80 transition hover:bg-rose-400/10 hover:text-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#120921] motion-reduce:transition-none"
            onClick={onLogout}
          >
            <span
              aria-hidden="true"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06]"
            >
              <LogOut className="h-5 w-5" />
            </span>
            Sign out
          </button>
        </footer>
      </aside>
    </div>
  );
}
