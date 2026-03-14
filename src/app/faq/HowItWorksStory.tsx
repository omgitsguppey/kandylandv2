"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  Clock3,
  Gift,
  Images,
  Lock,
  PlayCircle,
  Sparkles,
  Wallet,
} from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/Button";
import { useAuthIdentity } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { cn } from "@/lib/utils";
import {
  GUMDROPS_PRIMARY_CTA,
  GUMDROPS_SUPPORT_COPY,
  SECONDARY_UNWRAP_CTA,
} from "@/lib/marketing-copy";
import type { HowItWorksStep } from "./faq-data";

type HowItWorksStoryProps = {
  steps: readonly HowItWorksStep[];
};

export function HowItWorksStory({ steps }: HowItWorksStoryProps) {
  const [activeStepId, setActiveStepId] = useState<HowItWorksStep["id"]>(steps[0]?.id ?? "join");
  const { user } = useAuthIdentity();
  const { openAuthModal, openPurchaseModal } = useUI();
  const router = useRouter();

  const activeStep = useMemo(
    () => steps.find((step) => step.id === activeStepId) ?? steps[0],
    [activeStepId, steps]
  );

  if (!activeStep) {
    return null;
  }

  const handlePrimaryAction = () => {
    if (!user) {
      openAuthModal("signup");
      return;
    }

    if (activeStep.id === "experiences") {
      router.push("/experiences");
      return;
    }

    router.push("/drops");
  };

  const handleSecondaryAction = () => {
    if (!user) {
      openAuthModal("signup");
      return;
    }

    openPurchaseModal();
  };

  return (
    <section className="mb-8 space-y-3.5 sm:mb-14 sm:space-y-6">
      <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2 sm:overflow-x-auto sm:pb-1 no-scrollbar">
        {steps.map((step, index) => {
          const isActive = step.id === activeStep.id;
          const isLastOddItem = steps.length % 2 !== 0 && index === steps.length - 1;

          return (
            <button
              key={step.id}
              type="button"
              onClick={() => setActiveStepId(step.id)}
              className={cn(
                "relative min-w-0 rounded-[1.15rem] border px-3 py-2.5 text-left transition-all sm:shrink-0 sm:rounded-full sm:px-4 sm:py-2",
                isLastOddItem && "col-span-2",
                isActive
                  ? "border-brand-purple/40 bg-brand-purple/15 text-white shadow-[0_0_25px_rgba(164,118,255,0.18)]"
                  : "border-white/10 bg-white/[0.03] text-gray-400"
              )}
            >
              <span className="block text-[10px] font-black uppercase tracking-[0.22em] text-brand-purple/80">
                0{index + 1}
              </span>
              <span className="block text-sm font-bold leading-tight">{step.label}</span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 sm:gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <motion.div
          key={activeStep.id}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="rounded-[1.6rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(164,118,255,0.18),transparent_52%)] bg-[#08080D] p-3 shadow-[0_25px_70px_rgba(0,0,0,0.45)] sm:rounded-[2rem] sm:p-4"
        >
          <StoryVisual stepId={activeStep.id} />
        </motion.div>

        <motion.div
          key={`${activeStep.id}-content`}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-3.5 shadow-xl shadow-black/25 sm:rounded-[2rem] sm:p-5"
        >
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-brand-purple">{activeStep.eyebrow}</p>
          <h2 className="mt-3 text-[1.6rem] font-black tracking-tight text-white max-[360px]:text-[1.45rem] sm:text-3xl">{activeStep.title}</h2>
          <p className="mt-3 text-sm leading-6 text-gray-300 sm:text-base sm:leading-7">{activeStep.description}</p>

          <div className="mt-5 grid gap-3 sm:grid-cols-[auto_1fr]">
            <div className="rounded-2xl border border-brand-purple/20 bg-brand-purple/10 px-4 py-3 text-center sm:min-w-[108px]">
              <div className="text-lg font-black tracking-tight text-white">{activeStep.metricValue}</div>
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-purple/80">
                {activeStep.metricLabel}
              </div>
            </div>
            <details className="rounded-2xl border border-white/10 bg-black/35 text-left text-sm text-gray-300">
              <summary className="cursor-pointer list-none px-4 py-3 font-semibold text-white">
                See more about this step
              </summary>
              <div className="space-y-3 border-t border-white/10 px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  {activeStep.callouts.map((callout) => (
                    <span
                      key={callout}
                      className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-gray-200"
                    >
                      {callout}
                    </span>
                  ))}
                </div>
                <p className="text-sm leading-6 text-gray-300">{GUMDROPS_SUPPORT_COPY}</p>
              </div>
            </details>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <Button
              type="button"
              variant="brand"
              size="lg"
              onClick={handlePrimaryAction}
              className="w-full rounded-2xl px-6 text-base font-extrabold shadow-[0_0_30px_rgba(164,118,255,0.35)] max-[360px]:min-h-12"
            >
              {SECONDARY_UNWRAP_CTA}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="brand"
              size="lg"
              onClick={handleSecondaryAction}
              className="h-auto min-h-[3.25rem] w-full rounded-2xl px-5 py-3.5 text-left text-sm font-bold leading-5 whitespace-normal text-white shadow-[0_0_26px_rgba(164,118,255,0.22)] sm:min-h-14 sm:py-4"
            >
              {GUMDROPS_PRIMARY_CTA}
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function StoryVisual({ stepId }: { stepId: HowItWorksStep["id"] }) {
  if (stepId === "join") {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-3.5 py-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-purple/80">Free profile</p>
            <p className="text-lg font-bold text-white">Start your stash</p>
          </div>
          <div className="rounded-full border border-brand-purple/30 bg-brand-purple/15 px-3 py-1 text-xs font-bold text-brand-purple">
            Mobile first
          </div>
        </div>
        <div className="grid gap-3 rounded-[1.55rem] border border-white/10 bg-black/50 p-3 sm:grid-cols-[1.02fr_0.98fr] sm:p-4">
          <div className="rounded-[1.35rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(164,118,255,0.12),transparent_55%)] p-3.5">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-purple/20 bg-brand-purple/10 px-3 py-1 text-xs font-bold text-brand-purple">
              <Sparkles className="h-3.5 w-3.5" />
              Welcome to KandyDrops
            </div>
            <div className="space-y-2.5">
              {["Email address", "Password", "Day 1 ready"].map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-sm font-medium text-gray-200">
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-3.5">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
              <Check className="h-4 w-4 text-brand-purple" />
              What you unlock with a free account
            </div>
            <div className="space-y-2">
              {["Save your library", "Track daily rewards", "Unwrap live KandyDrops"].map((item) => (
                <div key={item} className="rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-gray-300">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (stepId === "gumdrops") {
    return (
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[1.55rem] border border-white/10 bg-white/[0.03] p-3.5">
            <div className="flex items-center justify-between">
              <div className="rounded-full border border-brand-purple/25 bg-brand-purple/15 p-2">
                <Wallet className="h-5 w-5 text-brand-purple" />
              </div>
              <span className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs font-bold text-gray-300">
                Wallet
              </span>
            </div>
            <div className="mt-4 text-3xl font-black tracking-tight text-white">550 GD</div>
            <p className="mt-1 text-sm text-gray-400">Ready to unwrap before the timer ends</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {["250", "1000"].map((bundle, index) => (
                <div
                  key={bundle}
                  className={cn(
                    "rounded-2xl border px-3 py-2.5 text-center text-xs font-bold",
                    index === 1
                      ? "border-brand-purple/35 bg-brand-purple/15 text-white"
                      : "border-white/10 bg-black/35 text-gray-300"
                  )}
                >
                  {bundle} GD
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[1.55rem] border border-white/10 bg-black/45 p-3.5">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
              <Gift className="h-4 w-4 text-brand-purple" />
              Experiences rewards
            </div>
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
              {["10", "20", "30", "40"].map((value, index) => (
                <div
                  key={value}
                  className={cn(
                    "rounded-2xl border px-3 py-4 text-center text-sm font-black",
                    index === 0
                      ? "border-brand-purple/30 bg-brand-purple/15 text-brand-purple"
                      : "border-white/10 bg-white/[0.03] text-white"
                  )}
                >
                  {value}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="rounded-[1.55rem] border border-white/10 bg-[linear-gradient(135deg,rgba(164,118,255,0.10),rgba(255,255,255,0.03))] p-3.5">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-brand-purple/80">Use Gum Drops</p>
          <p className="mt-2 text-base font-bold text-white">Earn them, buy them, then stay ready for the next live unwrap.</p>
        </div>
      </div>
    );
  }

  if (stepId === "unwrap") {
    return (
      <div className="space-y-3">
        <div className="rounded-[1.55rem] border border-white/10 bg-black/45 p-3.5">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-brand-purple/25 bg-brand-purple/15 px-3 py-1 text-xs font-bold text-brand-purple">
              Featured Drop
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold text-gray-200">
              <Clock3 className="mr-1 inline h-3.5 w-3.5" />
              Ends in 5 days
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold text-gray-200">
              <Images className="mr-1 inline h-3.5 w-3.5" />
              +3 Files
            </span>
          </div>
          <div className="relative overflow-hidden rounded-[1.35rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(164,118,255,0.18),transparent_60%)] p-3">
            <div className="absolute inset-0 bg-black/48 backdrop-blur-md" />
            <div className="relative z-10 space-y-3">
              <div className="overflow-hidden rounded-[1.25rem] border border-white/10 bg-white/[0.06]">
                <div className="h-36 bg-[linear-gradient(135deg,rgba(164,118,255,0.24),rgba(255,255,255,0.08))] sm:h-40" />
                <div className="border-t border-white/10 bg-black/40 px-3.5 py-3">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-purple/80">Live now</p>
                  <p className="mt-1 text-sm font-bold text-white">See the timer, tags, and file count before you commit.</p>
                </div>
              </div>
              <div className="rounded-[1.25rem] border border-white/10 bg-black/70 px-4 py-3.5 shadow-[0_0_30px_rgba(164,118,255,0.12)]">
                <div className="flex items-center gap-2 text-white">
                  <Lock className="h-[18px] w-[18px] text-brand-purple" />
                  <span className="text-sm font-bold">Unwrap now to reveal every file</span>
                </div>
                <div className="mt-3 flex items-center justify-between rounded-2xl border border-brand-purple/25 bg-brand-purple/15 px-3.5 py-3 text-sm font-bold text-white">
                  <span>Get Gum Drops to Unwrap your Kandy</span>
                  <ArrowRight className="h-4 w-4 text-brand-purple" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (stepId === "library") {
    return (
      <div className="space-y-3">
        <div className="rounded-[1.55rem] border border-white/10 bg-black/45 p-3.5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-brand-purple/80">Your library</p>
              <p className="text-lg font-bold text-white">Already unwrapped</p>
            </div>
            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300">
              Keeps access
            </span>
          </div>
          <div className="rounded-[1.35rem] border border-white/10 bg-[#101019] p-2.5">
            <div className="overflow-hidden rounded-[1.2rem] border border-white/10 bg-black/45">
              <div className="flex items-center justify-between border-b border-white/10 px-3 py-2.5">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-purple/80">Viewer</p>
                  <p className="text-sm font-bold text-white">Taste your Kandy</p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold text-gray-200">
                  +4 files
                </span>
              </div>
              <div className="h-32 bg-[linear-gradient(135deg,rgba(164,118,255,0.24),rgba(255,255,255,0.06))] sm:h-36" />
            </div>
            <div className="mt-2.5 grid grid-cols-4 gap-2">
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className={cn(
                    "rounded-[1rem] border p-1.5",
                    index === 0
                      ? "border-brand-purple/35 bg-brand-purple/12"
                      : "border-white/10 bg-white/[0.03]"
                  )}
                >
                  <div className="h-12 rounded-[0.8rem] bg-black/45 sm:h-14" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="rounded-[1.55rem] border border-white/10 bg-white/[0.03] p-3.5 text-sm leading-6 text-gray-300">
          Unwrap while the KandyDrop is live, then come back from any phone or desktop device to watch it again from your library.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-[1.55rem] border border-white/10 bg-black/45 p-3.5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-brand-purple/80">Experiences</p>
            <p className="text-lg font-bold text-white">Return tomorrow</p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold text-gray-200">
            Daily rewards
          </span>
        </div>
        <div className="mt-3.5 rounded-[1.35rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(164,118,255,0.18),transparent_55%)] p-3.5">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
            <Sparkles className="h-4 w-4 text-brand-purple" />
            Daily Kandy streak
          </div>
          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7 sm:gap-2">
            {["10", "20", "30", "40", "50", "60", "70"].map((value, index) => (
              <div
                key={value}
                className={cn(
                    "rounded-2xl border px-1.5 py-3.5 text-center text-[11px] font-black sm:px-2 sm:py-4 sm:text-xs",
                  index === 0
                    ? "border-brand-purple/30 bg-brand-purple/15 text-brand-purple"
                    : "border-white/10 bg-white/[0.03] text-white"
                )}
                >
                  {value}
                </div>
              ))}
          </div>
          <div className="mt-3 rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-gray-300">
            Day 1 starts the momentum. Keep checking in so your stash is ready for the next live drop.
          </div>
        </div>
      </div>
      <div className="rounded-[1.55rem] border border-white/10 bg-white/[0.03] p-3.5">
        <div className="flex items-center gap-2 text-sm font-bold text-white">
          <PlayCircle className="h-4 w-4 text-brand-purple" />
          Stay ready to unwrap again
        </div>
      </div>
    </div>
  );
}
