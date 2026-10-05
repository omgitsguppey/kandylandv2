"use client";

import { NativeSelect } from "@/components/ui/native-select";

export type CreatorSettingsRunwayScope = {
    id: string;
    kind: "operation" | "setting";
    title: string;
    state: string;
    summary: string;
    detail: string;
    href?: string;
    actionLabel?: string;
    sourceTruth?: string;
    sourceFreshness?: string;
    sampleCount?: number;
    fanPassManagementState?: string;
    bookingsManagementState?: string;
    chatRouteConnected?: boolean;
    creatorEarningsSource?: string;
    creatorEarningsAttribution?: string;
};

type CreatorSettingsScopePickerProps = {
    activeId: string | null;
    items: CreatorSettingsRunwayScope[];
    onSelect: (id: string) => void;
};

export function CreatorSettingsScopePicker({ activeId, items, onSelect }: CreatorSettingsScopePickerProps) {
    const settings = items.filter((item) => item.kind === "setting");
    const operations = items.filter((item) => item.kind === "operation");

    return (
        <label className="block" data-creator-settings-scope-picker="true">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-primary">Choose one focus</span>
            <NativeSelect
                value={activeId ?? ""}
                onChange={(event) => onSelect(event.target.value)}
                className="min-h-12 w-full rounded-2xl bg-secondary px-3 text-sm font-semibold text-foreground outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-ring/25"
            >
                <optgroup label="Set your creator world">
                    {settings.map((item) => <option key={item.id} value={item.id}>{item.title} - {item.state.replaceAll("_", " ")}</option>)}
                </optgroup>
                <optgroup label="Operate your creator world">
                    {operations.map((item) => <option key={item.id} value={item.id}>{item.title} - {item.state.replaceAll("_", " ")}</option>)}
                </optgroup>
            </NativeSelect>
        </label>
    );
}
