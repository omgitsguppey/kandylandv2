import os
import re

PAGE_PATH = r'C:\Users\uylus\OneDrive\Documents\KandyDrops_Final\src\app\dashboard\profile\page.tsx'
HOOKS_DIR = r'C:\Users\uylus\OneDrive\Documents\KandyDrops_Final\src\app\dashboard\profile\hooks'
COMPS_DIR = r'C:\Users\uylus\OneDrive\Documents\KandyDrops_Final\src\app\dashboard\profile\components'

with open(PAGE_PATH, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Primitives
primitives_match = re.search(r'(function SectionContainer\(.*?\nexport default function ProfilePage)', content, re.DOTALL)
primitives_code = primitives_match.group(1).replace('export default function ProfilePage', '')

primitives_file_content = """import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import React from 'react';

""" + primitives_code

with open(os.path.join(COMPS_DIR, 'ProfilePrimitives.tsx'), 'w', encoding='utf-8') as f:
    # Need to export the functions
    for func in ['SectionContainer', 'NavigationRow', 'ToggleRow', 'StaticRow', 'ValueInputRow', 'RowDivider']:
        primitives_file_content = primitives_file_content.replace(f'function {func}', f'export function {func}')
    f.write(primitives_file_content)

# 2. Hook
hook_match = re.search(r'export default function ProfilePage\(\) \{\n(.*?)(\s*return \(\n\s*<div)', content, re.DOTALL)
hook_code = hook_match.group(1)

hook_file_content = """import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useAuth, useUserProfile } from "@/context/AuthContext";
import { updateProfile } from "firebase/auth";
import { authFetch } from "@/lib/authFetch";
import { toast } from "sonner";
import { storage } from "@/lib/firebase-data";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { SITE_ORIGIN } from "@/lib/site-origin";
import { mutate } from "swr";
import { getBrowserNotificationState } from "@/lib/firebase-messaging";
import { enableBrowserNotifications } from "@/lib/browser-notification-enrollment";
import { CREATOR_BOOKING_RATES, CREATOR_SUBSCRIPTION_MIN_GD, DEFAULT_CREATOR_SETTINGS, type CreatorSettings } from "@/lib/creator-experiences";
import { getBrowserGlobalPrivacyControl, persistPrivacySettingsSnapshot } from "@/lib/privacy-consent";
import { getClientErrorMessage, reportClientIssue } from "@/lib/client-error-reporting";
import { trackEvent } from "@/lib/telemetry";

const TIMEZONE_OPTIONS = [
    "Auto",
    "UTC",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "Europe/London",
    "Europe/Berlin",
    "Asia/Tokyo",
] as const;

export type TimezoneOption = (typeof TIMEZONE_OPTIONS)[number];

export interface ProfileSettingsFormState {
    displayName: string;
    username: string;
    dateOfBirth: string;
    timezone: TimezoneOption;
    inAppEnabled: boolean;
    browserPushEnabled: boolean;
    newDropAlerts: boolean;
    expiringSoonAlerts: boolean;
    anonymousAnalyticsEnabled: boolean;
    identifiedAnalyticsEnabled: boolean;
    allowRecommendations: boolean;
    showInAnonymousStats: boolean;
    honorGlobalPrivacyControl: boolean;
}

export type CreatorLoadTarget = "settings" | "broadcasts";

export function getCreatorLoadFailureMessage(target: CreatorLoadTarget, status?: number) {
    if (target === "settings") {
        if (status === 403) {
            return "You don't have creator privileges yet.";
        }
        return "Failed to load creator defaults. Contact support.";
    }
    // broadcasts
    if (status === 403) {
        return "Not authorized to read broadcasts.";
    }
    return "Failed to refresh fan broadcasts.";
}

export async function readJsonSafely<T>(response: Response): Promise<T | null> {
    try {
        return await response.json() as T;
    } catch (err) {
        return null;
    }
}

export function normalizeTimezone(value: unknown): TimezoneOption {
    if (typeof value !== "string") {
        return "Auto";
    }

    const normalized = value.trim() as TimezoneOption;
    return TIMEZONE_OPTIONS.includes(normalized) ? normalized : "Auto";
}

export function sanitizeUsername(value: string): string {
    return value.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9_]/g, "");
}

export function buildFormState(params: any): ProfileSettingsFormState {
    return {
        displayName: (params.displayName ?? "").trim(),
        username: sanitizeUsername((params.username ?? "").trim()),
        dateOfBirth: typeof params.dateOfBirth === "string" ? params.dateOfBirth : "",
        timezone: normalizeTimezone(params.timezone),
        inAppEnabled: params.inAppEnabled !== false,
        browserPushEnabled: params.browserPushEnabled === true,
        newDropAlerts: params.newDropAlerts !== false,
        expiringSoonAlerts: params.expiringSoonAlerts !== false,
        anonymousAnalyticsEnabled: params.anonymousAnalyticsEnabled === true,
        identifiedAnalyticsEnabled: params.identifiedAnalyticsEnabled === true,
        allowRecommendations: params.allowRecommendations === true,
        showInAnonymousStats: params.showInAnonymousStats === true,
        honorGlobalPrivacyControl: params.honorGlobalPrivacyControl === true,
    };
}

export function useProfileState() {
""" + hook_code + """

  return {
    user, userProfile, logout,
    formState, updateForm, saving, saveFeedback,
    isDownloading, isDeleting, isUploadingAvatar,
    notificationSetupLoading, notificationSupportMessage,
    runtimeOrigin, creatorSettingsState, creatorSettingsLoading,
    creatorStats, creatorBroadcasts, creatorBroadcastMessage,
    setCreatorBroadcastMessage, sendingCreatorBroadcast,
    creatorDropModalOpen, setCreatorDropModalOpen,
    creatorPayoutAmount, setCreatorPayoutAmount,
    browserGpcEnabled, isCreatorAccount,
    profileName, profileEmail, profileUsername,
    profileIdentityLabel, profileIdentityDetail,
    avatarFallback, referralLink,
    handleBrowserPushToggle, handleWithdrawOptionalTracking,
    handleDownloadData, handleRequestDeletion,
    handleChangeAvatar, handleSaveCreatorSettings,
    handleSendCreatorBroadcast, handleRequestCreatorPayout,
    updateCreatorSettingsState, setCreatorSettingsState
  };
}
"""

with open(os.path.join(HOOKS_DIR, 'useProfileState.tsx'), 'w', encoding='utf-8') as f:
    f.write(hook_file_content)

print("Extracted hook and primitives")
