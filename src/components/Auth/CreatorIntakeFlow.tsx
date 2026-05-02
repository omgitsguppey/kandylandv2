"use client";

import type { FieldErrors, UseFormRegister, UseFormSetValue, UseFormWatch } from "react-hook-form";
import { Calendar, Lock, Mail, User } from "lucide-react";

import {
    CREATOR_FANS_ASK_FOR_ACCESS_OPTIONS,
    CREATOR_FOLLOWER_RANGE_OPTIONS,
    CREATOR_INTAKE_STEPS,
    CREATOR_MONETIZATION_GOAL_OPTIONS,
    CREATOR_PLATFORM_OPTIONS,
    CREATOR_POSTING_FREQUENCY_OPTIONS,
    CREATOR_RECOMMENDED_SETUP_OPTIONS,
    recommendCreatorSetupFromGoals,
    type CreatorMonetizationGoal,
    type CreatorRecommendedSetup,
} from "@/lib/creator-intake-flow";

import type { AuthFormData } from "./AuthHelpers";

type CreatorIntakeFlowProps = {
    step: number;
    register: UseFormRegister<AuthFormData>;
    setValue: UseFormSetValue<AuthFormData>;
    watch: UseFormWatch<AuthFormData>;
    errors: FieldErrors<AuthFormData>;
    checkingUsername: boolean;
    usernameAvailable: boolean | null;
    markUsernameTouched: () => void;
    onGoalSelected: (goals: CreatorMonetizationGoal[], selectedGoal: CreatorMonetizationGoal) => void;
};

function normalizeGoals(value: unknown): CreatorMonetizationGoal[] {
    return Array.isArray(value)
        ? value.filter((entry): entry is CreatorMonetizationGoal => CREATOR_MONETIZATION_GOAL_OPTIONS.some((option) => option.value === entry))
        : [];
}

function fieldError(message: unknown) {
    return typeof message === "string" ? <p className="pl-1 text-xs text-red-400">{message}</p> : null;
}

function selectClassName() {
    return "block w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm text-white transition-colors focus:border-brand-purple focus:outline-none";
}

function inputClassName(withIcon = false) {
    return `block w-full rounded-xl border border-white/10 bg-black/50 ${withIcon ? "px-10" : "px-4"} py-3 text-sm text-white transition-colors focus:border-brand-purple focus:outline-none`;
}

export function CreatorIntakeFlow({
    step,
    register,
    setValue,
    watch,
    errors,
    checkingUsername,
    usernameAvailable,
    markUsernameTouched,
    onGoalSelected,
}: CreatorIntakeFlowProps) {
    const currentStep = CREATOR_INTAKE_STEPS[step] ?? CREATOR_INTAKE_STEPS[0];
    const selectedGoals = normalizeGoals(watch("creatorMonetizationGoals"));
    const selectedSetup = watch("creatorRecommendedSetup") as CreatorRecommendedSetup | undefined;

    const toggleGoal = (goal: CreatorMonetizationGoal) => {
        const nextGoals = selectedGoals.includes(goal)
            ? selectedGoals.filter((entry) => entry !== goal)
            : [...selectedGoals, goal];
        setValue("creatorMonetizationGoals", nextGoals, { shouldDirty: true, shouldValidate: true });
        setValue("creatorRecommendedSetup", recommendCreatorSetupFromGoals(nextGoals), { shouldDirty: true, shouldValidate: true });
        onGoalSelected(nextGoals, goal);
    };

    return (
        <section
            data-creator-intake-step={currentStep.key}
            className="space-y-4 rounded-[1.4rem] border border-white/10 bg-black/30 p-4 sm:p-5"
        >
            <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-purple">
                    Step {step + 1} of {CREATOR_INTAKE_STEPS.length}
                </p>
                <h3 className="text-lg font-black leading-tight text-white">{currentStep.title}</h3>
                {"copy" in currentStep && currentStep.copy ? (
                    <p className="text-sm leading-6 text-zinc-300">{currentStep.copy}</p>
                ) : null}
            </div>

            {step === 0 ? (
                <div className="space-y-3">
                    <div className="grid gap-2">
                        {CREATOR_MONETIZATION_GOAL_OPTIONS.map((option) => {
                            const selected = selectedGoals.includes(option.value);
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    aria-pressed={selected}
                                    onClick={() => toggleGoal(option.value)}
                                    className={`min-h-12 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-colors ${
                                        selected
                                            ? "border-brand-purple bg-brand-purple/20 text-white"
                                            : "border-white/10 bg-zinc-950 text-zinc-200 hover:border-brand-purple/60"
                                    }`}
                                >
                                    {option.label}
                                </button>
                            );
                        })}
                    </div>
                    {fieldError(errors.creatorMonetizationGoals?.message)}
                </div>
            ) : null}

            {step === 1 ? (
                <div className="space-y-3">
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-zinc-400">Creator name</label>
                        <div className="relative overflow-hidden">
                            <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
                            <input
                                {...register("creatorDisplayName")}
                                type="text"
                                className={inputClassName(true)}
                                placeholder="What should fans call you?"
                            />
                        </div>
                        {fieldError(errors.creatorDisplayName?.message)}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-zinc-400">Primary platform</label>
                            <select {...register("creatorPrimaryPlatform")} className={selectClassName()}>
                                <option value="" className="bg-black">Choose one</option>
                                {CREATOR_PLATFORM_OPTIONS.map((option) => (
                                    <option key={option} value={option} className="bg-black">{option}</option>
                                ))}
                            </select>
                            {fieldError(errors.creatorPrimaryPlatform?.message)}
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-medium text-zinc-400">Follower range</label>
                            <select {...register("creatorFollowerRange")} className={selectClassName()}>
                                <option value="" className="bg-black">Choose one</option>
                                {CREATOR_FOLLOWER_RANGE_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value} className="bg-black">{option.label}</option>
                                ))}
                            </select>
                            {fieldError(errors.creatorFollowerRange?.message)}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-zinc-400">Posting rhythm</label>
                        <select {...register("creatorPostingFrequency")} className={selectClassName()}>
                            <option value="" className="bg-black">Choose one</option>
                            {CREATOR_POSTING_FREQUENCY_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value} className="bg-black">{option.label}</option>
                            ))}
                        </select>
                        {fieldError(errors.creatorPostingFrequency?.message)}
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-zinc-400">Content focus</label>
                        <textarea
                            {...register("creatorContentFocus")}
                            rows={3}
                            className="block w-full resize-none rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm text-white transition-colors focus:border-brand-purple focus:outline-none"
                            placeholder="A short note about what you make and what fans ask for."
                        />
                        {fieldError(errors.creatorContentFocus?.message)}
                    </div>

                    <div className="space-y-2">
                        <p className="text-xs font-medium text-zinc-400">Do fans already ask for access?</p>
                        <div className="grid grid-cols-3 gap-2">
                            {CREATOR_FANS_ASK_FOR_ACCESS_OPTIONS.map((option) => {
                                const selected = watch("fansAlreadyAskForAccess") === option.value;
                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        aria-pressed={selected}
                                        onClick={() => setValue("fansAlreadyAskForAccess", option.value, { shouldDirty: true, shouldValidate: true })}
                                        className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
                                            selected
                                                ? "border-brand-purple bg-brand-purple/20 text-white"
                                                : "border-white/10 bg-zinc-950 text-zinc-300 hover:border-brand-purple/60"
                                        }`}
                                    >
                                        {option.label}
                                    </button>
                                );
                            })}
                        </div>
                        {fieldError(errors.fansAlreadyAskForAccess?.message)}
                    </div>
                </div>
            ) : null}

            {step === 2 ? (
                <div className="space-y-2">
                    {CREATOR_RECOMMENDED_SETUP_OPTIONS.map((option) => {
                        const selected = selectedSetup === option.value;
                        return (
                            <button
                                key={option.value}
                                type="button"
                                aria-pressed={selected}
                                onClick={() => setValue("creatorRecommendedSetup", option.value, { shouldDirty: true, shouldValidate: true })}
                                className={`min-h-12 w-full rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-colors ${
                                    selected
                                        ? "border-brand-purple bg-brand-purple/20 text-white"
                                        : "border-white/10 bg-zinc-950 text-zinc-200 hover:border-brand-purple/60"
                                }`}
                            >
                                {option.label}
                            </button>
                        );
                    })}
                    {fieldError(errors.creatorRecommendedSetup?.message)}
                </div>
            ) : null}

            {step === 3 ? (
                <div className="rounded-2xl border border-white/10 bg-zinc-950 p-4 text-sm leading-6 text-zinc-300">
                    The agreement is the next checkpoint before creator tools turn on. You can finish this intake now, then review and sign from your creator status page.
                </div>
            ) : null}

            {step === 4 ? (
                <div className="space-y-3">
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-zinc-400">Username</label>
                        <div className="relative overflow-hidden">
                            <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
                            <input
                                {...register("username", {
                                    onChange: markUsernameTouched,
                                })}
                                type="text"
                                autoComplete="username"
                                className={inputClassName(true)}
                                placeholder="Create your KandyDrops username"
                            />
                        </div>
                        {fieldError(errors.username?.message)}
                        {!errors.username && checkingUsername ? <p className="pl-1 text-xs text-zinc-400">Checking username...</p> : null}
                        {!errors.username && !checkingUsername && usernameAvailable === true ? <p className="pl-1 text-xs text-brand-purple">Username available.</p> : null}
                        {!errors.username && !checkingUsername && usernameAvailable === false ? <p className="pl-1 text-xs text-red-400">Username already taken.</p> : null}
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-zinc-400">Date of birth</label>
                        <div className="relative overflow-hidden">
                            <Calendar className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
                            <input
                                {...register("dob")}
                                type="date"
                                className={`${inputClassName(true)} appearance-none pr-4 [color-scheme:dark]`}
                            />
                        </div>
                        {fieldError(errors.dob?.message)}
                        <p className="pl-1 text-xs text-zinc-500">Creators must be 18 or older.</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-zinc-400">Email</label>
                        <div className="relative overflow-hidden">
                            <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
                            <input
                                {...register("email")}
                                type="email"
                                autoComplete="email"
                                className={inputClassName(true)}
                                placeholder="Where should we contact you?"
                            />
                        </div>
                        {fieldError(errors.email?.message)}
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-zinc-400">Password</label>
                        <div className="relative overflow-hidden">
                            <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
                            <input
                                {...register("password")}
                                type="password"
                                autoComplete="new-password"
                                className={inputClassName(true)}
                                placeholder="Create a password"
                            />
                        </div>
                        {fieldError(errors.password?.message)}
                    </div>
                </div>
            ) : null}
        </section>
    );
}
