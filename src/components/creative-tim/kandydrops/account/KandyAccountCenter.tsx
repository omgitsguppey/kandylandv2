"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  Coins,
  Heart,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";

import { UserSettingsPage } from "@/components/Settings/UserSettingsPage";
import { Badge } from "@/components/creative-tim/ui/badge";
import { Card } from "@/components/creative-tim/ui/card";
import { useAuth } from "@/context/AuthContext";
import { KandyAccountCanvas } from "./KandyAccountCanvas";

function formatGumDrops(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

function getAvatarInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "K";
}

function getRoleLabel(role?: string) {
  if (role === "admin") {
    return "Admin access";
  }

  if (role === "creator") {
    return "Creator account";
  }

  return "Kandy member";
}

export function KandyAccountCenter() {
  const { loading, user, userProfile } = useAuth();
  const profileName = userProfile?.displayName || user?.displayName || "Your KandyDrops account";
  const profileEmail = userProfile?.email || user?.email || "Account details are loading";
  const gumDropsBalance = typeof userProfile?.gumDropsBalance === "number"
    ? userProfile.gumDropsBalance
    : null;
  const purchasedBalance = typeof userProfile?.gumDropsPurchasedBalance === "number"
    ? userProfile.gumDropsPurchasedBalance
    : null;
  const rewardBalance = typeof userProfile?.gumDropsRewardBalance === "number"
    ? userProfile.gumDropsRewardBalance
    : null;
  const sourceBalancesAvailable = purchasedBalance !== null || rewardBalance !== null;

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#08040f] px-4 pb-[calc(7.5rem+env(safe-area-inset-bottom))] pt-6 text-white sm:px-6 sm:pt-10 lg:px-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_12%_0%,rgba(255,111,207,0.2),transparent_26rem),radial-gradient(circle_at_78%_12%,rgba(178,140,255,0.26),transparent_31rem),linear-gradient(180deg,rgba(35,17,57,0.8),transparent)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-80 bg-[radial-gradient(circle_at_50%_100%,rgba(178,140,255,0.13),transparent_62%)]"
      />

      <div className="relative mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col gap-5 rounded-[2rem] border border-white/10 bg-white/[0.045] px-5 py-6 shadow-[0_26px_80px_rgba(0,0,0,0.3)] backdrop-blur-xl sm:px-7 lg:mb-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <Badge className="mb-3 rounded-full border-brand-purple/30 bg-brand-purple/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-purple-100 hover:bg-brand-purple/15">
              Account center
            </Badge>
            <h1 className="font-display text-3xl font-black tracking-[-0.05em] text-white sm:text-4xl">
              Your KandyDrops, organized.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/65 sm:text-base">
              Keep your identity, preferences, and account safeguards together without losing your place in the fun.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-2xl border border-white/15 bg-black/25 px-4 text-sm font-bold text-white transition hover:border-brand-pink/40 hover:bg-brand-pink/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2 focus-visible:ring-offset-[#08040f] lg:self-auto"
          >
            My KandyDrops
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </header>

        <div className="space-y-6">
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Account overview">
            <Card className="!gap-0 !overflow-hidden !rounded-[2rem] !border-white/10 !bg-[linear-gradient(145deg,rgba(255,255,255,0.1),rgba(255,255,255,0.035)_45%,rgba(178,140,255,0.12))] !p-0 shadow-[0_24px_65px_rgba(0,0,0,0.3)]">
              <div className="relative overflow-hidden px-5 pb-5 pt-6 sm:px-6">
                <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-brand-pink/20 blur-3xl" />
                <div className="relative flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.2rem] border border-white/15 bg-gradient-to-br from-brand-pink/35 via-brand-purple/30 to-[#15101f] text-lg font-black text-white shadow-[0_0_30px_rgba(255,111,207,0.18)]">
                    {getAvatarInitial(profileName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-pink">Personal space</p>
                    <h2 className="mt-1 truncate text-xl font-black tracking-tight text-white">{profileName}</h2>
                    <p className="mt-1 truncate text-sm text-white/58">{profileEmail}</p>
                  </div>
                </div>

                <div className="relative mt-5 flex items-center justify-between border-t border-white/10 pt-4">
                  <span className="inline-flex items-center gap-2 text-xs font-semibold text-white/65">
                    <ShieldCheck className="h-4 w-4 text-brand-purple" aria-hidden="true" />
                    Account status
                  </span>
                  <Badge className="rounded-full border-brand-purple/25 bg-brand-purple/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-purple-100 hover:bg-brand-purple/15">
                    {getRoleLabel(userProfile?.role)}
                  </Badge>
                </div>
              </div>
            </Card>

            <Card className="!gap-0 !rounded-[2rem] !border-brand-purple/25 !bg-[linear-gradient(145deg,rgba(178,140,255,0.2),rgba(16,11,26,0.92)_58%,rgba(255,111,207,0.1))] !p-0 shadow-[0_22px_55px_rgba(0,0,0,0.24)]">
              <div className="px-5 py-5 sm:px-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-brand-purple/30 bg-brand-purple/15 text-brand-purple">
                    <Coins className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-purple-200/70">GumDrops</p>
                    <p className="text-sm font-bold text-white">Your balance</p>
                  </div>
                </div>

                {gumDropsBalance !== null ? (
                  <p className="mt-5 text-4xl font-black tracking-[-0.05em] text-white">
                    {formatGumDrops(gumDropsBalance)}
                  </p>
                ) : (
                  <p aria-live="polite" className="mt-5 text-sm font-semibold text-white/60">
                    {loading ? "Getting your balance..." : "Your balance is unavailable right now."}
                  </p>
                )}
                <p className="mt-1 text-xs font-semibold text-white/55">Available GumDrops</p>

                {sourceBalancesAvailable ? (
                  <div className="mt-5 grid grid-cols-2 gap-2 border-t border-white/10 pt-4">
                    {purchasedBalance !== null ? (
                      <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.13em] text-white/45">Paid</p>
                        <p className="mt-1 text-sm font-black text-white">{formatGumDrops(purchasedBalance)}</p>
                      </div>
                    ) : null}
                    {rewardBalance !== null ? (
                      <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.13em] text-white/45">Earned</p>
                        <p className="mt-1 text-sm font-black text-white">{formatGumDrops(rewardBalance)}</p>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </Card>

            <section className="rounded-[1.75rem] border border-white/10 bg-black/20 p-5 backdrop-blur-sm sm:p-6" aria-labelledby="account-spaces-heading">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-brand-pink" aria-hidden="true" />
                <h2 id="account-spaces-heading" className="text-sm font-black text-white">Your account spaces</h2>
              </div>
              <ul className="mt-4 space-y-3 text-sm text-white/65">
                <li className="flex items-center gap-3">
                  <UserRound className="h-4 w-4 shrink-0 text-brand-purple" aria-hidden="true" />
                  Profile and sign-in details
                </li>
                <li className="flex items-center gap-3">
                  <Heart className="h-4 w-4 shrink-0 text-brand-pink" aria-hidden="true" />
                  Notifications and privacy choices
                </li>
                <li className="flex items-center gap-3">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-brand-purple" aria-hidden="true" />
                  Data, support, and safety controls
                </li>
              </ul>
            </section>
          </section>

          <KandyAccountCanvas>
            <section
              aria-labelledby="personal-settings-heading"
              className="rounded-[2rem] border border-white/10 bg-[#0d0915]/80 p-3 shadow-[0_28px_80px_rgba(0,0,0,0.32)] backdrop-blur-xl sm:p-5"
            >
            <div className="flex flex-col gap-2 border-b border-white/10 px-2 pb-5 pt-2 sm:flex-row sm:items-end sm:justify-between sm:px-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-pink">Personal settings</p>
                <h2 id="personal-settings-heading" className="mt-1 text-2xl font-black tracking-[-0.04em] text-white">
                  Make this space yours.
                </h2>
              </div>
              <p className="text-sm leading-5 text-white/55 sm:max-w-52 sm:text-right">
                Update what you share, what you hear from us, and how your account stays protected.
              </p>
            </div>

            <div className="pt-2">
              <UserSettingsPage />
            </div>
            </section>
          </KandyAccountCanvas>
        </div>
      </div>
    </main>
  );
}
