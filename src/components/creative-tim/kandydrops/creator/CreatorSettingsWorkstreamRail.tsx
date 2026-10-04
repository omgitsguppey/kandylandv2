"use client";

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
            <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-purple-200">Choose one focus</span>
            <select
                value={activeId ?? ""}
                onChange={(event) => onSelect(event.target.value)}
                className="min-h-12 w-full rounded-2xl border border-white/12 bg-black/30 px-3 text-sm font-bold text-white outline-none transition focus:border-brand-purple/60 focus:ring-2 focus:ring-brand-purple/25"
            >
                <optgroup label="Set your creator world">
                    {settings.map((item) => <option key={item.id} value={item.id}>{item.title} - {item.state.replaceAll("_", " ")}</option>)}
                </optgroup>
                <optgroup label="Operate your creator world">
                    {operations.map((item) => <option key={item.id} value={item.id}>{item.title} - {item.state.replaceAll("_", " ")}</option>)}
                </optgroup>
            </select>
        </label>
    );
}
