import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { HumanErrorNotice } from "@/components/errors/HumanErrorNotice";
import type { resolveClientActionError } from "@/lib/errors/client-error-adapter";
import type { ModuleKey } from "./types";
import { moduleLabels } from "./types";

type Tone = "good" | "warn" | "bad" | "neutral";
type SettingsModuleError = ReturnType<typeof resolveClientActionError>;

function toneClasses(tone: Tone) {
    switch (tone) {
        case "good":
            return "border-success/20 bg-success/10 text-success";
        case "warn":
            return "border-warning/20 bg-warning/10 text-warning";
        case "bad":
            return "border-destructive/20 bg-destructive/10 text-destructive";
        default:
            return "border-border bg-secondary text-foreground";
    }
}

export function CreatorWorkspaceStatusPill({ label, tone = "neutral" }: { label: string; tone?: Tone }) {
    return (
        <Badge variant="secondary" className={`rounded-xl border px-3 py-2 text-xs font-semibold ${toneClasses(tone)}`}>
            {label}
        </Badge>
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
                <Card
                    className="gap-0 py-0 rounded-2xl border border-warning/20 bg-warning/10 px-4 py-3 text-sm text-warning"
                    data-creator-landing-source-state={settingsSourceNotice.state}
                    data-creator-landing-source-review="partial_safe"
                >
                    <p className="font-semibold text-warning">{settingsSourceNotice.title}</p>
                    <p className="mt-0.5 text-warning/85">{settingsSourceNotice.body}</p>
                </Card>
            ) : null}

            {moduleErrorEntries.length > 0 ? (
                <Card className="gap-0 py-0 rounded-2xl border border-warning/20 bg-warning/10 px-4 py-3 text-sm text-warning">
                    {moduleErrorEntries.map(([module]) => `${moduleLabels[module]} could not load right now.`).join(" | ")}
                </Card>
            ) : null}
        </>
    );
}
