"use client";

import Link from "next/link";
import { ArrowRight, Megaphone, ShieldCheck, Sparkles } from "lucide-react";

import { KandySettingsPanel } from "./AccountSettingsPanel";

export function CreatorSettingsMigrationPanel({ href }: { href: string }) {
  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#08040f] px-4 pb-[calc(7.5rem+env(safe-area-inset-bottom))] pt-6 text-white sm:px-6 sm:pt-10 lg:px-8">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[30rem] bg-[radial-gradient(circle_at_12%_0%,rgba(255,111,207,0.18),transparent_24rem),radial-gradient(circle_at_82%_10%,rgba(178,140,255,0.24),transparent_30rem),linear-gradient(180deg,rgba(35,17,57,0.72),transparent)]" />
      <div className="relative mx-auto max-w-5xl">
        <header className="rounded-[2rem] border border-white/10 bg-white/[0.045] px-5 py-6 shadow-[0_26px_80px_rgba(0,0,0,0.3)] backdrop-blur-xl sm:px-7">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-brand-pink"><Sparkles className="h-4 w-4" /> Account center</p>
          <h1 className="mt-3 max-w-2xl text-3xl font-black tracking-[-0.05em] text-white sm:text-4xl">Creator tools have their own studio now.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65 sm:text-base">Your account settings stay here. Creator broadcasts, Fan Pass, bookings, requests, payouts, and availability now live together in Creator Settings.</p>
        </header>

        <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(15rem,0.85fr)]">
          <KandySettingsPanel
            eyebrow="Creator workspace"
            title="Continue to Creator Settings"
            description="Use one workspace for the tools that affect your audience and creator business."
            icon={Megaphone}
          >
            <div className="space-y-4 px-4 py-5 sm:px-5">
              <div className="rounded-2xl border border-brand-purple/20 bg-brand-purple/10 px-4 py-4 text-sm leading-6 text-purple-100">
                This page has moved so account preferences and creator operations do not compete for the same space.
              </div>
              <Link
                href={href}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-brand-purple px-4 text-sm font-bold text-white shadow-lg shadow-brand-purple/25 transition hover:bg-brand-purple/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2 focus-visible:ring-offset-[#08040f] sm:w-auto"
              >
                Open Creator Settings
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </KandySettingsPanel>

          <aside className="rounded-[1.75rem] border border-white/10 bg-black/20 p-5 backdrop-blur-sm sm:p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-brand-purple/25 bg-brand-purple/15 text-brand-purple"><ShieldCheck className="h-5 w-5" aria-hidden="true" /></span>
              <div>
                <p className="text-sm font-black text-white">What stays in your account</p>
                <p className="mt-1 text-xs leading-5 text-white/55">Personal details, notifications, privacy, and account safety.</p>
              </div>
            </div>
            <div className="mt-5 space-y-3 border-t border-white/10 pt-4 text-sm text-white/65">
              <p>Creator operations are now grouped by the work they control.</p>
              <p>Account preferences remain separate from audience and payout tools.</p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
