import { Sparkles, Flame, Droplets } from 'lucide-react';
import { getCSTDayBoundaries } from '@/lib/timezone';

export type FlavorPreference = "Sweet" | "Spicy" | "RAW" | "";

export type StepDefinition = {
    id: string;
    title: string;
    description: string;
    path: string;
};

export type OnboardingStepMetric = {
    stepId: string;
    stepIndex: number;
    stepTitle: string;
    stepPath: string;
    startedAtMs: number;
    completedAtMs: number;
    durationMs: number;
    completionReason: string;
};

export const DASHBOARD_ONBOARDING_PATH = "/dashboard";

export const STEP_DEFINITIONS: StepDefinition[] = [
    {
        id: "flavor_preference",
        title: "Start with your flavor",
        description: "Pick the vibe you want to see first. You can change it any time in your profile.",
        path: DASHBOARD_ONBOARDING_PATH,
    },
    {
        id: "daily_check_in",
        title: "Claim today's Gum Drops",
        description: "Lock in your streak now so your dashboard starts working for you right away.",
        path: DASHBOARD_ONBOARDING_PATH,
    },
    {
        id: "live_drops",
        title: "Live drops move fast",
        description: "When a live drop expires, it leaves the public Drops page. Unwrap before the timer runs out to keep it in your library.",
        path: DASHBOARD_ONBOARDING_PATH,
    },
    {
        id: "experiences",
        title: "Daily experiences keep you stocked",
        description: "Check in, clear your missions, and keep your Gum Drop balance ready for the next unwrap.",
        path: DASHBOARD_ONBOARDING_PATH,
    },
    {
        id: "notifications",
        title: "Get the heads-up first",
        description: "Turn on alerts and we'll nudge you when drops go live or your daily loop resets.",
        path: DASHBOARD_ONBOARDING_PATH,
    },
    {
        id: "complete",
        title: "You're ready",
        description: "Your dashboard is set. Start from here, keep your streak alive, and unwrap when you're ready.",
        path: DASHBOARD_ONBOARDING_PATH,
    },
];

export const FLAVOR_OPTIONS: Array<{
    value: Exclude<FlavorPreference, "">;
    label: string;
    description: string;
    icon: typeof Sparkles;
    accentClass: string;
    activeClass: string;
    iconClass: string;
}> = [
    {
        value: "Sweet",
        label: "Sweet",
        description: "Light, playful, and teasing.",
        icon: Sparkles,
        accentClass: "text-pink-400",
        activeClass: "border-pink-400/60 bg-pink-500/10 shadow-[0_0_24px_rgba(236,72,153,0.16)]",
        iconClass: "bg-pink-500 text-white",
    },
    {
        value: "Spicy",
        label: "Spicy",
        description: "Bold, hot, and attention-grabbing.",
        icon: Flame,
        accentClass: "text-orange-400",
        activeClass: "border-orange-400/60 bg-orange-500/10 shadow-[0_0_24px_rgba(249,115,22,0.16)]",
        iconClass: "bg-orange-500 text-white",
    },
    {
        value: "RAW",
        label: "RAW",
        description: "Direct, intense, and unfiltered.",
        icon: Droplets,
        accentClass: "text-brand-purple",
        activeClass: "border-brand-purple/60 bg-brand-purple/10 shadow-[0_0_24px_rgba(168,85,247,0.16)]",
        iconClass: "bg-brand-purple text-white",
    },
];

export function normalizeTimestamp(value: unknown): number {
    if (!Number.isFinite(value)) {
        return 0;
    }

    const timestamp = Number(value);
    return timestamp > 0 ? Math.floor(timestamp) : 0;
}

export function hasClaimedToday(value: unknown): boolean {
    const lastCheckIn = normalizeTimestamp(value);
    if (!lastCheckIn) {
        return false;
    }

    const { startOfDay, endOfDay } = getCSTDayBoundaries(Date.now());
    return lastCheckIn >= startOfDay && lastCheckIn < endOfDay;
}

export function focusDashboardHome() {
    if (typeof window === "undefined") {
        return;
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
    window.requestAnimationFrame(() => {
        const dashboardHome = document.getElementById("dashboard-home");
        dashboardHome?.scrollIntoView({ block: "start", behavior: "smooth" });
        if (dashboardHome instanceof HTMLElement) {
            dashboardHome.focus({ preventScroll: true });
        }
    });
}
