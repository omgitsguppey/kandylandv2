import { HumanErrorNotice } from "@/components/errors/HumanErrorNotice";
import type { resolveClientActionError } from "@/lib/errors/client-error-adapter";
import type { ModuleKey } from "./types";
import { moduleLabels } from "./types";

type Tone = "good" | "warn" | "bad" | "neutral";
type SettingsModuleError = ReturnType<typeof resolveClientActionError>;

function toneClasses(tone: Tone) {
    switch (tone) {
        case "good":
            return "border-emerald-400/20 bg-emerald-500/10 text-emerald-100";
        case "warn":
            return "border-amber-400/20 bg-amber-500/10 text-amber-100";
        case "bad":
            return "border-red-400/20 bg-red-500/10 text-red-100";
        default:
            return "border-white/10 bg-white/5 text-gray-200";
    }
}

export function CreatorWorkspaceStatusPill({ label, tone = "neutral" }: { label: string; tone?: Tone }) {
    return (
        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${toneClasses(tone)}`}>
            {label}
        </span>
    );
}

export function CreatorDashboardSourceNotice({
    settingsModuleError,
    settingsSourceNotice,
    moduleErrorEntries,
    onSubmitSettingsBug,
}: {
    settingsModuleError: SettingsModuleError | null;
    settingsSourceNotice: { title: string; body: string; state: string } | null;
    moduleErrorEntries: [ModuleKey, string][];
    onSubmitSettingsBug: (error: SettingsModuleError) => void;
}) {
    return (
        <>
            {settingsModuleError ? (
                <HumanErrorNotice
                    descriptor={settingsModuleError.descriptor}
                    compact
                    onSubmitBug={() => onSubmitSettingsBug(settingsModuleError)}
                />
            ) : null}

            {!settingsModuleError && settingsSourceNotice ? (
                <div
                    className="rounded-[1.1rem] border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100 sm:px-4 sm:py-3 sm:text-sm"
                    data-creator-landing-source-state={settingsSourceNotice.state}
                    data-creator-landing-source-review="partial_safe"
                >
                    <p className="font-bold text-amber-50">{settingsSourceNotice.title}</p>
                    <p className="mt-0.5 text-amber-100/85">{settingsSourceNotice.body}</p>
                </div>
            ) : null}

            {moduleErrorEntries.length > 0 ? (
                <div className="rounded-[1.1rem] border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100 sm:px-4 sm:py-3 sm:text-sm">
                    {moduleErrorEntries.map(([module]) => `${moduleLabels[module]} could not load right now.`).join(" | ")}
                </div>
            ) : null}
        </>
    );
}
