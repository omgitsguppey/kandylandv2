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
import { motion, useReducedMotion } from "framer-motion";

import { Button } from "@/components/ui/Button";
import { useAuthIdentity } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { cn } from "@/lib/utils";
import { SECONDARY_UNWRAP_CTA } from "@/lib/marketing-copy";
import type { HowItWorksStep } from "./faq-data";

type HowItWorksStoryProps = {
  steps: readonly HowItWorksStep[];
};

const STORY_SCENES = {
  join: {
    icon: Sparkles,
    detailIcon: Check,
    eyebrow: "Open your stash",
    title: "A profile keeps every choice together.",
    note: "Your library and daily progress stay tied to your account.",
    points: ["Create", "Collect", "Keep"],
  },
  gumdrops: {
    icon: Wallet,
    detailIcon: Gift,
    eyebrow: "Fill the jar",
    title: "GumDrops keep an unwrap within reach.",
    note: "Earn Reward GD through Experiences or add GumDrops when you choose.",
    points: ["Earn", "Add", "Unwrap"],
  },
  unwrap: {
    icon: Lock,
    detailIcon: Clock3,
    eyebrow: "Choose the Drop",
    title: "See the public details before you unwrap.",
    note: "The cover, timer, and file count help you decide what belongs in your library.",
    points: ["Preview", "Choose", "Reveal"],
  },
  library: {
    icon: Images,
    detailIcon: Check,
    eyebrow: "Keep the moment",
    title: "Your unwrapped Drops live in one library.",
    note: "Return to the Drops you chose from your personal collection.",
    points: ["Unwrapped", "Organized", "Ready"],
  },
  experiences: {
    icon: Gift,
    detailIcon: PlayCircle,
    eyebrow: "Return daily",
    title: "Experiences build momentum for the next Drop.",
    note: "Check in, complete daily tasks, and stay ready for another unwrap.",
    points: ["Check in", "Complete", "Return"],
  },
} as const;

export function HowItWorksStory({ steps }: HowItWorksStoryProps) {
  const [activeStepId, setActiveStepId] = useState<HowItWorksStep["id"]>(steps[0]?.id ?? "join");
  const { user } = useAuthIdentity();
  const { openAuthModal } = useUI();
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();

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

  const panelId = `how-it-works-panel-${activeStep.id}`;
  const stepTabId = `how-it-works-tab-${activeStep.id}`;
  const motionTransition = shouldReduceMotion ? { duration: 0 } : { duration: 0.28, ease: "easeOut" as const };

  return (
    <section className="relative space-y-5 sm:space-y-7" aria-labelledby="how-it-works-story-title">
      <header className="border-b border-white/10 pb-5 sm:pb-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-pink-100/70">Five-step Kandy guide</p>
            <h2 id="how-it-works-story-title" className="mt-1 text-2xl font-black tracking-[-0.045em] text-white sm:text-3xl">
              Follow the unwrap from start to library.
            </h2>
          </div>
          <p className="hidden text-xs font-semibold uppercase tracking-[0.18em] text-white/45 sm:block">
            Step {steps.findIndex((step) => step.id === activeStep.id) + 1} of {steps.length}
          </p>
        </div>

        <div
          role="tablist"
          aria-label="How KandyDrops works"
          className="mt-5 flex gap-2 overflow-x-auto pb-1 no-scrollbar"
        >
          {steps.map((step, index) => {
            const isActive = step.id === activeStep.id;
            const tabId = "how-it-works-tab-" + step.id;

            return (
              <button
                key={step.id}
                id={tabId}
                role="tab"
                type="button"
                onClick={() => setActiveStepId(step.id)}
                aria-selected={isActive}
                aria-controls={"how-it-works-panel-" + step.id}
                tabIndex={isActive ? 0 : -1}
                className={cn(
                  "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm font-black transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-100/60",
                  isActive
                    ? "border-pink-100/30 bg-[linear-gradient(135deg,rgba(236,72,153,0.28),rgba(168,85,247,0.24))] text-white shadow-[0_0_22px_rgba(236,72,153,0.14)]"
                    : "border-white/8 bg-white/[0.025] text-white/54 hover:bg-white/[0.06]"
                )}
              >
                <span className={cn("flex h-6 w-6 items-center justify-center rounded-full text-[10px]", isActive ? "bg-white/16 text-pink-50" : "bg-black/25 text-white/42")}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                {step.label}
              </button>
            );
          })}
        </div>
      </header>

      <motion.article
        key={activeStep.id}
        id={panelId}
        role="tabpanel"
        aria-labelledby={stepTabId}
        initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={motionTransition}
        className="relative overflow-hidden rounded-[2rem] border border-pink-100/14 bg-[linear-gradient(145deg,rgba(58,15,73,0.84),rgba(10,4,18,0.98)_58%,rgba(28,8,44,0.9))] shadow-[0_26px_74px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.09)]"
      >
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-fuchsia-300/14 blur-[66px] motion-reduce:hidden" aria-hidden="true" />
        <div className="relative px-5 py-6 sm:px-7 sm:py-8">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-pink-100/72">{activeStep.eyebrow}</p>
          <h3 className="mt-3 max-w-3xl text-[1.8rem] font-black leading-[0.95] tracking-[-0.055em] text-white sm:text-3xl">{activeStep.title}</h3>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70 sm:text-base sm:leading-7">{activeStep.description}</p>

          <div className="mt-6 flex flex-col gap-4 border-y border-white/10 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-2xl font-black tracking-[-0.04em] text-white">{activeStep.metricValue}</div>
              <div className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-pink-100/76">
                {activeStep.metricLabel}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {activeStep.callouts.map((callout) => (
                <span
                  key={callout}
                  className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-semibold text-white/72"
                >
                  {callout}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="relative border-y border-white/10 px-4 py-4 sm:px-6 sm:py-6">
          <StoryVisual stepId={activeStep.id} />
        </div>

        <div className="relative px-5 py-5 sm:px-7 sm:py-6">
          <Button
            type="button"
            variant="brand"
            size="lg"
            onClick={handlePrimaryAction}
            className="min-h-12 w-full rounded-2xl bg-[linear-gradient(135deg,#f9a8d4,#d946ef_42%,#9333ea)] px-6 text-base font-black text-white shadow-[0_14px_34px_rgba(217,70,239,0.34),inset_0_1px_0_rgba(255,255,255,0.34)] transition-transform hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(217,70,239,0.44)]"
          >
            {SECONDARY_UNWRAP_CTA}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </motion.article>
    </section>
  );
}
function StoryVisual({ stepId }: { stepId: HowItWorksStep["id"] }) {
  const scene = STORY_SCENES[stepId as keyof typeof STORY_SCENES] ?? STORY_SCENES.experiences;
  const Icon = scene.icon;
  const DetailIcon = scene.detailIcon;

  return (
    <div className="relative grid min-h-[20rem] gap-4 sm:min-h-[22rem] sm:grid-cols-[minmax(0,0.9fr)_minmax(10rem,0.7fr)] sm:items-stretch">
      <div className="relative flex flex-col justify-between overflow-hidden rounded-[1.5rem] border border-white/12 bg-[radial-gradient(circle_at_18%_8%,rgba(249,168,212,0.16),transparent_32%),rgba(6,2,12,0.42)] p-5">
        <div className="pointer-events-none absolute bottom-0 left-0 h-40 w-40 rounded-full bg-brand-purple/18 blur-[48px] motion-reduce:hidden" aria-hidden="true" />
        <div className="relative">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-pink-100/22 bg-white/[0.08] text-pink-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
            <Icon className="h-6 w-6" />
          </div>
          <p className="mt-5 text-[10px] font-black uppercase tracking-[0.22em] text-pink-100/70">{scene.eyebrow}</p>
          <h4 className="mt-2 max-w-sm text-2xl font-black leading-[0.96] tracking-[-0.045em] text-white">{scene.title}</h4>
        </div>

        <div className="relative mt-6 rounded-[1.2rem] border border-white/10 bg-black/25 p-3.5">
          <div className="flex items-center gap-2 text-sm font-black text-white">
            <DetailIcon className="h-4 w-4 text-pink-200" />
            KandyDrops keeps the next move clear.
          </div>
          <p className="mt-2 text-xs leading-5 text-white/60">{scene.note}</p>
        </div>
      </div>

      <div className="grid grid-rows-3 gap-3">
        {scene.points.map((point, index) => (
          <div
            key={point}
            className={cn(
              "relative flex items-center gap-3 overflow-hidden rounded-[1.25rem] border p-3.5",
              index === 1
                ? "border-pink-100/24 bg-[linear-gradient(135deg,rgba(236,72,153,0.22),rgba(168,85,247,0.2))] text-white"
                : "border-white/10 bg-black/20 text-white/78"
            )}
          >
            <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-black", index === 1 ? "bg-white/12 text-pink-50" : "bg-white/[0.06] text-pink-100")}>
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="text-sm font-black leading-tight">{point}</span>
            {index === 1 ? <span className="absolute inset-y-3 right-0 w-px bg-gradient-to-b from-transparent via-pink-100/60 to-transparent" aria-hidden="true" /> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
