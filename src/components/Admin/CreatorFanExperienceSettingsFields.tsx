"use client";

import {
  CREATOR_BOOKING_MIN_MINUTES,
  CREATOR_BOOKING_RATES,
  CREATOR_SUBSCRIPTION_MIN_GD,
  type CreatorAvailabilityWindow,
  type CreatorRequestCategoryConfig,
  type CreatorRestrictions,
  type CreatorSettings,
} from "@/lib/creator-experiences";

type Props = {
  settings: CreatorSettings;
  restrictions: CreatorRestrictions;
  restrictionConfirmed: boolean;
  revenuePauseSelected: boolean;
  setSettings: (updater: (current: CreatorSettings) => CreatorSettings) => void;
  setRestrictions: (updater: (current: CreatorRestrictions) => CreatorRestrictions) => void;
  setRestrictionConfirmed: (value: boolean) => void;
};

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function inputClass() {
  return "w-full rounded-2xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-white outline-none focus:border-brand-purple/60";
}

function cardClass() {
  return "rounded-2xl border border-white/10 bg-black/25 p-3";
}

function FieldLabel(props: { children: string }) {
  return <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{props.children}</span>;
}

function toNumber(value: string) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.round(numeric) : 0;
}

function updateCategory(categories: CreatorRequestCategoryConfig[], id: string, patch: Partial<CreatorRequestCategoryConfig>) {
  return categories.map((category) => category.id === id ? { ...category, ...patch } : category);
}

function updateAvailabilityWindow(windows: CreatorAvailabilityWindow[], id: string, patch: Partial<CreatorAvailabilityWindow>) {
  return windows.map((window) => window.id === id ? { ...window, ...patch } : window);
}

function ToggleRow(props: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-zinc-200">
      <span>{props.label}</span>
      <input type="checkbox" checked={props.checked} onChange={(event) => props.onChange(event.target.checked)} className="h-4 w-4 accent-brand-purple" />
    </label>
  );
}

function NumericField(props: { label: string; value: number; min: number; max?: number; onChange: (value: number) => void }) {
  return (
    <label className="space-y-2">
      <FieldLabel>{props.label}</FieldLabel>
      <input
        type="number"
        min={props.min}
        max={props.max}
        step={1}
        value={props.value}
        onChange={(event) => props.onChange(toNumber(event.target.value))}
        className={inputClass()}
      />
    </label>
  );
}

export function CreatorFanExperienceSettingsFields({
  settings,
  restrictions,
  restrictionConfirmed,
  revenuePauseSelected,
  setSettings,
  setRestrictions,
  setRestrictionConfirmed,
}: Props) {
  return (
    <>
      <div className={cardClass()}>
        <p className="text-sm font-bold text-white">Access toggles</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {[
            ["subscriptionsEnabled", "Fan Pass"],
            ["messagingEnabled", "Private chat"],
            ["customRequestsEnabled", "Custom requests"],
            ["bookingsEnabled", "Live time"],
            ["broadcastsEnabled", "Broadcasts"],
          ].map(([key, label]) => (
            <ToggleRow key={key} label={label} checked={settings[key as keyof CreatorSettings] === true} onChange={(checked) => setSettings((current) => ({ ...current, [key]: checked }))} />
          ))}
          <ToggleRow label="Subscriber chat included" checked={settings.chatFreeForSubscribers} onChange={(checked) => setSettings((current) => ({ ...current, chatFreeForSubscribers: checked }))} />
        </div>
      </div>

      <div className={cardClass()}>
        <p className="text-sm font-bold text-white">Pricing</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <NumericField label="Fan Pass GD" value={settings.subscriptionPriceGd} min={CREATOR_SUBSCRIPTION_MIN_GD} onChange={(value) => setSettings((current) => ({ ...current, subscriptionPriceGd: value }))} />
          <NumericField label="Phone GD / minute" value={settings.phoneRatePerMinuteGd} min={CREATOR_BOOKING_RATES.phone} onChange={(value) => setSettings((current) => ({ ...current, phoneRatePerMinuteGd: value }))} />
          <NumericField label="Video GD / minute" value={settings.videoRatePerMinuteGd} min={CREATOR_BOOKING_RATES.video} onChange={(value) => setSettings((current) => ({ ...current, videoRatePerMinuteGd: value }))} />
          <NumericField label="Live time minimum" value={settings.bookingMinimumMinutes} min={CREATOR_BOOKING_MIN_MINUTES} onChange={(value) => setSettings((current) => ({ ...current, bookingMinimumMinutes: value }))} />
          <NumericField label="Fan Pass video discount" value={settings.videoSubscriberDiscountPercent} min={0} max={100} onChange={(value) => setSettings((current) => ({ ...current, videoSubscriberDiscountPercent: value }))} />
        </div>
      </div>

      <div className={cardClass()}>
        <p className="text-sm font-bold text-white">Requests</p>
        <div className="mt-3 space-y-2">
          {settings.requestCategories.map((category) => (
            <div key={category.id} className="grid gap-2 rounded-2xl border border-white/10 bg-black/20 p-3 sm:grid-cols-[1fr_120px_auto]">
              <label className="space-y-2">
                <FieldLabel>Request name</FieldLabel>
                <input value={category.label} onChange={(event) => setSettings((current) => ({ ...current, requestCategories: updateCategory(current.requestCategories, category.id, { label: event.target.value }) }))} className={inputClass()} />
              </label>
              <NumericField label="GD" value={category.priceGd} min={0} onChange={(value) => setSettings((current) => ({ ...current, requestCategories: updateCategory(current.requestCategories, category.id, { priceGd: value }) }))} />
              <ToggleRow label="On" checked={category.enabled} onChange={(checked) => setSettings((current) => ({ ...current, requestCategories: updateCategory(current.requestCategories, category.id, { enabled: checked }) }))} />
            </div>
          ))}
        </div>
      </div>

      <div className={cardClass()}>
        <p className="text-sm font-bold text-white">Availability</p>
        <label className="mt-3 block space-y-2">
          <FieldLabel>Timezone</FieldLabel>
          <input value={settings.availabilityTimezone} onChange={(event) => setSettings((current) => ({ ...current, availabilityTimezone: event.target.value }))} className={inputClass()} />
        </label>
        <div className="mt-3 space-y-2">
          {settings.availabilityWindows.map((window) => (
            <div key={window.id} className="grid gap-2 rounded-2xl border border-white/10 bg-black/20 p-3 sm:grid-cols-5">
              <label className="space-y-2">
                <FieldLabel>Day</FieldLabel>
                <select value={window.dayOfWeek} onChange={(event) => setSettings((current) => ({ ...current, availabilityWindows: updateAvailabilityWindow(current.availabilityWindows, window.id, { dayOfWeek: toNumber(event.target.value) }) }))} className={inputClass()}>
                  {dayLabels.map((label, index) => <option key={label} value={index}>{label}</option>)}
                </select>
              </label>
              <TimeField label="Start" hour={window.startHour} minute={window.startMinute} onChange={(hour, minute) => setSettings((current) => ({ ...current, availabilityWindows: updateAvailabilityWindow(current.availabilityWindows, window.id, { startHour: hour, startMinute: minute }) }))} />
              <TimeField label="End" hour={window.endHour} minute={window.endMinute} onChange={(hour, minute) => setSettings((current) => ({ ...current, availabilityWindows: updateAvailabilityWindow(current.availabilityWindows, window.id, { endHour: hour, endMinute: minute }) }))} />
              {(["phone", "video"] as const).map((serviceType) => (
                <ToggleRow
                  key={serviceType}
                  label={serviceType === "phone" ? "Phone" : "Video"}
                  checked={window.serviceTypes.includes(serviceType)}
                  onChange={(checked) => setSettings((current) => ({ ...current, availabilityWindows: updateAvailabilityWindow(current.availabilityWindows, window.id, { serviceTypes: checked ? Array.from(new Set([...window.serviceTypes, serviceType])) : window.serviceTypes.filter((entry) => entry !== serviceType) }) }))}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className={cardClass()}>
        <p className="text-sm font-bold text-white">Restrictions</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {[
            ["subscriptionsRestricted", "Fan Pass paused"],
            ["messagingRestricted", "Private chat paused"],
            ["customRequestsRestricted", "Custom requests paused"],
            ["bookingsRestricted", "Live time paused"],
            ["broadcastsRestricted", "Broadcasts paused"],
            ["payoutsRestricted", "Payouts paused"],
            ["dropSubmissionsRestricted", "Drop submissions paused"],
          ].map(([key, label]) => (
            <ToggleRow key={key} label={label} checked={restrictions[key as keyof CreatorRestrictions] === true} onChange={(checked) => setRestrictions((current) => ({ ...current, [key]: checked }))} />
          ))}
        </div>
        {revenuePauseSelected ? (
          <label className="mt-3 flex min-h-11 items-start gap-3 rounded-2xl border border-brand-purple/25 bg-brand-purple/10 p-3 text-sm text-zinc-100">
            <input type="checkbox" checked={restrictionConfirmed} onChange={(event) => setRestrictionConfirmed(event.target.checked)} className="mt-1 h-4 w-4 accent-brand-purple" />
            <span>Confirm that one or more creator earning lanes may be paused. This is audited.</span>
          </label>
        ) : null}
      </div>
    </>
  );
}

function TimeField(props: { label: string; hour: number; minute: number; onChange: (hour: number, minute: number) => void }) {
  return (
    <label className="space-y-2">
      <FieldLabel>{props.label}</FieldLabel>
      <input
        type="time"
        value={`${String(props.hour).padStart(2, "0")}:${String(props.minute).padStart(2, "0")}`}
        onChange={(event) => {
          const [hour = "0", minute = "0"] = event.target.value.split(":");
          props.onChange(toNumber(hour), toNumber(minute));
        }}
        className={inputClass()}
      />
    </label>
  );
}
