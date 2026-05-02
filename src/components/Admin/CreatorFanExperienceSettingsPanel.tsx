"use client";

import { useEffect, useState } from "react";

import { CreatorFanExperienceSettingsFields } from "@/components/Admin/CreatorFanExperienceSettingsFields";
import {
  DEFAULT_CREATOR_RESTRICTIONS,
  DEFAULT_CREATOR_SETTINGS,
  type CreatorRestrictions,
  type CreatorSettings,
} from "@/lib/creator-experiences";
import type { CreatorFanExperienceSettingsCommand } from "@/lib/admin/creator-fan-experience-settings";

export type CreatorFanExperienceSettingsTarget = {
  uid: string;
  displayName: string;
  creatorSettings?: CreatorSettings;
  creatorRestrictions?: CreatorRestrictions;
};

type Props = {
  target: CreatorFanExperienceSettingsTarget;
  saving: boolean;
  onSubmit: (command: CreatorFanExperienceSettingsCommand) => Promise<void>;
};

function cloneDefaultSettings(): CreatorSettings {
  return {
    ...DEFAULT_CREATOR_SETTINGS,
    requestCategories: DEFAULT_CREATOR_SETTINGS.requestCategories.map((category) => ({ ...category })),
    availabilityWindows: DEFAULT_CREATOR_SETTINGS.availabilityWindows.map((window) => ({ ...window, serviceTypes: [...window.serviceTypes] })),
  };
}

function cloneDefaultRestrictions(): CreatorRestrictions {
  return { ...DEFAULT_CREATOR_RESTRICTIONS };
}

function getInitialSettings(target: CreatorFanExperienceSettingsTarget) {
  return target.creatorSettings ?? cloneDefaultSettings();
}

function getInitialRestrictions(target: CreatorFanExperienceSettingsTarget) {
  return target.creatorRestrictions ?? cloneDefaultRestrictions();
}

export function CreatorFanExperienceSettingsPanel({ target, saving, onSubmit }: Props) {
  const [settings, setSettings] = useState<CreatorSettings>(() => getInitialSettings(target));
  const [restrictions, setRestrictions] = useState<CreatorRestrictions>(() => getInitialRestrictions(target));
  const [restrictionConfirmed, setRestrictionConfirmed] = useState(false);

  useEffect(() => {
    setSettings(getInitialSettings(target));
    setRestrictions(getInitialRestrictions(target));
    setRestrictionConfirmed(false);
  }, [target]);

  const revenuePauseSelected = restrictions.messagingRestricted
    || restrictions.subscriptionsRestricted
    || restrictions.bookingsRestricted
    || restrictions.customRequestsRestricted
    || restrictions.broadcastsRestricted
    || restrictions.payoutsRestricted
    || restrictions.dropSubmissionsRestricted;

  const submit = async () => {
    await onSubmit({
      targetUserId: target.uid,
      creatorSettings: settings,
      creatorRestrictions: restrictions,
      restrictionConfirmed,
    });
    setRestrictionConfirmed(false);
  };

  return (
    <div className="mt-4 space-y-3">
      <CreatorFanExperienceSettingsFields
        settings={settings}
        restrictions={restrictions}
        restrictionConfirmed={restrictionConfirmed}
        revenuePauseSelected={revenuePauseSelected}
        setSettings={setSettings}
        setRestrictions={setRestrictions}
        setRestrictionConfirmed={setRestrictionConfirmed}
      />

      <button
        type="button"
        onClick={() => void submit()}
        disabled={saving || (revenuePauseSelected && !restrictionConfirmed)}
        className="min-h-11 w-full rounded-full bg-white px-4 py-2 text-sm font-bold text-black disabled:opacity-50 sm:w-auto"
      >
        Save fan experience settings
      </button>
    </div>
  );
}
