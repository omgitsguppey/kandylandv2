"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BellRing, CalendarCheck2, ChevronRight, Compass, Gift, Sparkles } from "lucide-react";

import {
    type FlavorPreference,
    FLAVOR_OPTIONS,
    STEP_DEFINITIONS,
} from "@/components/Auth/OnboardingHelpers";
import { cn } from "@/lib/utils";

type GuidedOnboardingSurfaceProps = {
    currentStep: number;
    flavorPreference: FlavorPreference;
    onFlavorPreferenceChange: (value: FlavorPreference) => void;
    progressPercent: number;
    hasCheckedInToday: boolean;
    isCheckingIn: boolean;
    isNotificationStepCompleted: boolean;
    isEnablingNotifications: boolean;
    isCompleting: boolean;
    onSaveFlavor: () => void;
    onCheckIn: () => void;
    onContinueDrops: () => void;
    onContinueExperiences: () => void;
    onEnableNotifications: () => void;
    onSkipNotifications: () => void;
    onComplete: () => void;
};

function PrimaryAction({
    children,
    disabled = false,
    onClick,
}: {
    children: ReactNode;
    disabled?: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-fuchsia-200/20 bg-gradient-to-r from-fuchsia-500 to-violet-500 px-5 py-3 text-sm font-black text-white shadow-[0_14px_30px_rgba(168,85,247,0.3)] transition-transform hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
            {children}
        </button>
    );
}

function StepIntro({
    icon: Icon,
    title,
    children,
}: {
    icon: typeof Gift;
    title: string;
    children: ReactNode;
}) {
    return (
        <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.35rem] border border-fuchsia-200/20 bg-fuchsia-400/[0.1] shadow-[0_12px_30px_rgba(168,85,247,0.16)]">
                <Icon className="h-7 w-7 text-fuchsia-100" aria-hidden="true" />
            </div>
            <h2 className="mt-5 text-2xl font-black tracking-tight text-white">{title}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-400">{children}</p>
        </div>
    );
}

export function GuidedOnboardingSurface({
    currentStep,
    flavorPreference,
    onFlavorPreferenceChange,
    progressPercent,
    hasCheckedInToday,
    isCheckingIn,
    isNotificationStepCompleted,
    isEnablingNotifications,
    isCompleting,
    onSaveFlavor,
    onCheckIn,
    onContinueDrops,
    onContinueExperiences,
    onEnableNotifications,
    onSkipNotifications,
    onComplete,
}: GuidedOnboardingSurfaceProps) {
    const activeStep = STEP_DEFINITIONS[currentStep];
    const activeStepTitle = activeStep?.title || "Getting started";

    return (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-[#09050f] px-3 py-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className="absolute -left-24 top-[-8rem] h-80 w-80 rounded-full bg-fuchsia-500/[0.2] blur-3xl" />
                <div className="absolute -right-28 bottom-[-10rem] h-96 w-96 rounded-full bg-violet-500/[0.17] blur-3xl" />
                <div className="absolute inset-x-0 top-0 h-36 bg-[linear-gradient(112deg,rgba(255,255,255,0.055),transparent_60%)]" />
            </div>

            <div className="relative mx-auto flex min-h-full w-full max-w-5xl items-center justify-center">
                <AnimatePresence mode="wait">
                    <motion.main
                        key={currentStep}
                        initial={{ opacity: 0, y: 18, scale: 0.985 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -14, scale: 0.985 }}
                        transition={{ duration: 0.22 }}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="guided-onboarding-title"
                        className="w-full overflow-hidden rounded-[2rem] border border-white/10 bg-[#120b1d]/90 shadow-[0_28px_90px_rgba(0,0,0,0.48)] backdrop-blur-xl"
                    >
                        <section className="flex min-h-[34rem] flex-col">
                                <header className="border-b border-white/10 px-5 py-4 sm:px-7">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-100/60">KandyDrops guided start</p>
                                            <h1 id="guided-onboarding-title" className="mt-1 text-lg font-black tracking-tight text-white sm:text-xl">{activeStepTitle}</h1>
                                        </div>
                                        <span className="rounded-full border border-fuchsia-200/20 bg-fuchsia-400/[0.1] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-fuchsia-100">
                                            Step {currentStep + 1} of {STEP_DEFINITIONS.length}
                                        </span>
                                    </div>
                                    <div
                                        role="progressbar"
                                        aria-label="Onboarding progress"
                                        aria-valuemin={0}
                                        aria-valuemax={100}
                                        aria-valuenow={progressPercent}
                                        className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.08]"
                                    >
                                        <div className="h-full rounded-full bg-gradient-to-r from-fuchsia-400 to-violet-400 transition-all duration-300" style={{ width: progressPercent + "%" }} />
                                    </div>
                                    <div className="mt-2 flex items-center justify-between text-xs font-semibold text-gray-500">
                                        <span>One focused task at a time</span>
                                        <span>{progressPercent}% complete</span>
                                    </div>
                                </header>

                                <div className="flex flex-1 flex-col justify-center px-5 py-7 sm:px-7 sm:py-9">
                                    {currentStep === 0 ? (
                                        <div>
                                            <div className="text-center">
                                                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.35rem] border border-fuchsia-200/20 bg-fuchsia-400/[0.1] shadow-[0_12px_30px_rgba(168,85,247,0.16)]">
                                                    <Sparkles className="h-7 w-7 text-fuchsia-100" aria-hidden="true" />
                                                </div>
                                                <h2 className="mt-5 text-2xl font-black tracking-tight text-white">Choose your flavor</h2>
                                                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-400">Set the tone for what you want to see first. You can change it later anytime.</p>
                                            </div>

                                            <div className="mx-auto mt-6 grid max-w-xl gap-2">
                                                {FLAVOR_OPTIONS.map((option) => {
                                                    const Icon = option.icon;
                                                    const active = flavorPreference === option.value;
                                                    return (
                                                        <button
                                                            key={option.value}
                                                            type="button"
                                                            onClick={() => onFlavorPreferenceChange(option.value)}
                                                            aria-pressed={active}
                                                            className={cn(
                                                                "flex min-h-[76px] w-full items-center gap-4 rounded-2xl border px-4 py-3 text-left transition-colors",
                                                                active
                                                                    ? cn(option.activeClass, "shadow-[0_12px_26px_rgba(168,85,247,0.14)]")
                                                                    : "border-white/10 bg-black/15 hover:border-white/20 hover:bg-white/[0.055]",
                                                            )}
                                                        >
                                                            <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", active ? option.iconClass : "bg-white/10 text-gray-400")}>
                                                                <Icon className="h-5 w-5" aria-hidden="true" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className={cn("text-sm font-black", active ? option.accentClass : "text-white")}>{option.label}</p>
                                                                <p className="mt-0.5 text-xs leading-5 text-gray-400">{option.description}</p>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ) : null}

                                    {currentStep === 1 ? (
                                        <StepIntro icon={CalendarCheck2} title="Claim today&apos;s Gum Drops">
                                            Start your streak now so your first unwrap is closer right away.
                                        </StepIntro>
                                    ) : null}

                                    {currentStep === 2 ? (
                                        <StepIntro icon={Gift} title="Live drops move fast">
                                            If a live drop matters to you, unwrap it before the timer ends so it stays in your library.
                                        </StepIntro>
                                    ) : null}

                                    {currentStep === 3 ? (
                                        <StepIntro icon={Compass} title="Daily experiences keep you stocked">
                                            Use your daily loop to keep Gum Drops coming in without leaving the dashboard rhythm.
                                        </StepIntro>
                                    ) : null}

                                    {currentStep === 4 ? (
                                        <StepIntro icon={BellRing} title="Get the heads-up first">
                                            Turn on alerts and we&apos;ll nudge you when drops go live or your daily loop resets.
                                        </StepIntro>
                                    ) : null}

                                    {currentStep === 5 ? (
                                        <StepIntro icon={Gift} title="You&apos;re ready">
                                            Your dashboard is set. You now have <span className="font-bold text-white">100 Gum Drops</span> ready for your first unwrap, and we&apos;ll keep you right here to start.
                                        </StepIntro>
                                    ) : null}
                                </div>

                                <footer className="border-t border-white/10 bg-black/20 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:px-7">
                                    {currentStep === 0 ? (
                                        <PrimaryAction disabled={!flavorPreference} onClick={onSaveFlavor}>
                                            Save flavor <ChevronRight className="h-4 w-4" aria-hidden="true" />
                                        </PrimaryAction>
                                    ) : null}

                                    {currentStep === 1 ? (
                                        <PrimaryAction disabled={isCheckingIn} onClick={onCheckIn}>
                                            {isCheckingIn ? "Checking in..." : hasCheckedInToday ? "Keep going" : "Claim today&apos;s drops"} <ChevronRight className="h-4 w-4" aria-hidden="true" />
                                        </PrimaryAction>
                                    ) : null}

                                    {currentStep === 2 ? (
                                        <PrimaryAction onClick={onContinueDrops}>
                                            I&apos;ll watch the timer <ChevronRight className="h-4 w-4" aria-hidden="true" />
                                        </PrimaryAction>
                                    ) : null}

                                    {currentStep === 3 ? (
                                        <PrimaryAction onClick={onContinueExperiences}>
                                            Show me the routine <ChevronRight className="h-4 w-4" aria-hidden="true" />
                                        </PrimaryAction>
                                    ) : null}

                                    {currentStep === 4 ? (
                                        <div className="space-y-2">
                                            <PrimaryAction disabled={isEnablingNotifications} onClick={onEnableNotifications}>
                                                {isNotificationStepCompleted ? "Alerts already on" : isEnablingNotifications ? "Turning on..." : "Turn on alerts"} <ChevronRight className="h-4 w-4" aria-hidden="true" />
                                            </PrimaryAction>
                                            <button
                                                type="button"
                                                onClick={onSkipNotifications}
                                                className="min-h-11 w-full rounded-xl border border-white/12 bg-white/[0.05] px-5 text-sm font-bold text-white transition-colors hover:bg-white/[0.08]"
                                            >
                                                Maybe later
                                            </button>
                                        </div>
                                    ) : null}

                                    {currentStep === 5 ? (
                                        <PrimaryAction disabled={isCompleting} onClick={onComplete}>
                                            {isCompleting ? "Finishing..." : "Enter dashboard"} <ChevronRight className="h-4 w-4" aria-hidden="true" />
                                        </PrimaryAction>
                                    ) : null}
                                </footer>
                        </section>
                    </motion.main>
                </AnimatePresence>
            </div>
        </div>
    );
}
