export interface AdminOnboardingStatsInput {
    starts?: number;
    completions: number;
    avgDuration: number;
    completionRate?: number;
    startSource?: "tracked" | "completion_fallback" | "none";
}

export interface AdminOnboardingStepStatInput {
    stepKey: string;
    stepTitle: string;
    stepIndex: number;
    starts: number;
    completions: number;
    avgDurationMs: number;
}

export interface AdminOnboardingStepModel extends AdminOnboardingStepStatInput {
    completionRate: number;
    dropOffCount: number;
    shortLabel: string;
}

export interface AdminOnboardingVelocityModel {
    starts: number;
    completions: number;
    completionRate: number;
    dropOffCount: number;
    hasVelocityData: boolean;
    steps: AdminOnboardingStepModel[];
    discrepancies: string[];
}

export function buildAdminOnboardingVelocityModel(input: {
    stats: AdminOnboardingStatsInput;
    durationBuckets: Array<{ label: string; count: number }>;
    steps: AdminOnboardingStepStatInput[];
    authSignUps: number;
}) : AdminOnboardingVelocityModel {
    const starts = input.stats.starts ?? 0;
    const completionRate = input.stats.completionRate ?? (
        starts > 0
            ? input.stats.completions / Math.max(1, starts)
            : 0
    );
    const dropOffCount = Math.max(0, starts - input.stats.completions);
    const steps = input.steps.map((step) => ({
        ...step,
        completionRate: step.starts > 0 ? step.completions / Math.max(1, step.starts) : 0,
        dropOffCount: Math.max(0, step.starts - step.completions),
        shortLabel: step.stepTitle.length > 18 ? `${step.stepTitle.slice(0, 18)}...` : step.stepTitle,
    }));
    const finalStep = steps.reduce<AdminOnboardingStepModel | null>((current, step) => {
        if (!current || step.stepIndex > current.stepIndex) {
            return step;
        }
        return current;
    }, null);

    return {
        starts,
        completions: input.stats.completions,
        completionRate,
        dropOffCount,
        hasVelocityData: input.durationBuckets.some((bucket) => bucket.count > 0),
        steps,
        discrepancies: [
            input.authSignUps !== starts
                ? `Auth sign-ups ${input.authSignUps} do not match onboarding starts ${starts}.`
                : "",
            finalStep && finalStep.completions !== input.stats.completions
                ? `Final onboarding step completions ${finalStep.completions} do not match onboarding completions ${input.stats.completions}.`
                : "",
        ].filter((entry): entry is string => entry.length > 0),
    };
}
