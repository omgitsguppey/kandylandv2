"use client";

import { Textarea } from "@/components/ui/textarea";
import { NativeSelectOption } from "@/components/ui/native-select";
import { NativeSelect } from "@/components/ui/native-select";
import { DisclosureSummary } from "@/components/ui/disclosure";
import { Disclosure } from "@/components/ui/disclosure";


import {
  SYNTHETIC_CREATOR_TYPE_LABELS,
  SYNTHETIC_CREATOR_TYPES,
  type SyntheticCreatorType,
} from "@/lib/admin/synthetic-creators-view-as";

export type SyntheticCreatorCreateValue = {
  isSyntheticCreator: boolean;
  syntheticCreatorType: SyntheticCreatorType;
  syntheticReason: string;
  humanOperatorRequired: boolean;
};

type SyntheticCreatorCreateFieldsProps = {
  value: SyntheticCreatorCreateValue;
  onChange: (value: SyntheticCreatorCreateValue) => void;
};

export function SyntheticCreatorCreateFields({ value, onChange }: SyntheticCreatorCreateFieldsProps) {
  return (
    <Disclosure className="mt-4 rounded-2xl border border-border bg-background/25 p-4">
      <DisclosureSummary className="cursor-pointer list-none text-sm font-semibold text-foreground">Synthetic creator</DisclosureSummary>
      <div className="mt-4 space-y-4">
        <label className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-background/30 px-4 py-3">
          <span>
            <span className="block text-sm font-semibold text-foreground">Create as synthetic creator</span>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">Use for internal characters, demos, AI personas, or QA accounts.</span>
          </span>
          <input
            type="checkbox"
            checked={value.isSyntheticCreator}
            onChange={(event) => onChange({ ...value, isSyntheticCreator: event.target.checked })}
            className="h-5 w-5 accent-brand-purple"
            aria-label="Create as synthetic creator"
          />
        </label>

        {value.isSyntheticCreator ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Type</span>
              <NativeSelect
                value={value.syntheticCreatorType}
                onChange={(event) => onChange({
                  ...value,
                  syntheticCreatorType: event.target.value as SyntheticCreatorType,
                })}
                className="w-full rounded-2xl border border-border bg-background/40 px-4 py-3 text-sm text-foreground outline-none focus:border-primary/60"
              >
                {SYNTHETIC_CREATOR_TYPES.map((type) => (
                  <NativeSelectOption key={type} value={type}>{SYNTHETIC_CREATOR_TYPE_LABELS[type]}</NativeSelectOption>
                ))}
              </NativeSelect>
            </label>
            <label className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-background/30 px-4 py-3">
              <span className="text-sm font-semibold text-foreground">Human operator required</span>
              <input
                type="checkbox"
                checked={value.humanOperatorRequired}
                onChange={(event) => onChange({ ...value, humanOperatorRequired: event.target.checked })}
                className="h-5 w-5 accent-brand-purple"
                aria-label="Human operator required"
              />
            </label>
            <Textarea
              value={value.syntheticReason}
              onChange={(event) => onChange({ ...value, syntheticReason: event.target.value })}
              rows={3}
              placeholder="Internal reason for this synthetic creator"
              className="rounded-2xl border border-border bg-background/40 px-4 py-3 text-sm text-foreground outline-none focus:border-primary/60 sm:col-span-2"
            />
          </div>
        ) : null}
      </div>
    </Disclosure>
  );
}
