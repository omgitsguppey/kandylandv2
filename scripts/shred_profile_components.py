import os
import re

PAGE_PATH = 'src/app/dashboard/profile/page.tsx'
COMPS_DIR = 'src/app/dashboard/profile/components'

with open(PAGE_PATH, 'r', encoding='utf-8') as f:
    content = f.read()

# Grab everything between `<form` and `</form>`
form_match = re.search(r'(<form.*?>\n)(.*)(\n\s*</form>)', content, re.DOTALL)
jsx_content = form_match.group(2)
sections_raw = re.split(r'(<SectionContainer title=".*?">)', jsx_content)

sections = []
for i in range(1, len(sections_raw), 2):
    title_match = re.search(r'title="(.*?)"', sections_raw[i])
    title = title_match.group(1) if title_match else "Unknown"
    body = sections_raw[i+1]
    end_idx = body.find('</SectionContainer>')
    
    if end_idx != -1:
        jsx_block = sections_raw[i] + body[:end_idx + 19]
    else:
        jsx_block = sections_raw[i] + body
        
    sections.append({
        "title": title,
        "jsx": jsx_block.strip()
    })

def sanitize_comp_name(t):
    return "Profile" + re.sub(r'[^a-zA-Z0-9]', '', t) + "Section"

for sec in sections:
    comp_name = sanitize_comp_name(sec['title'])
    file_path = os.path.join(COMPS_DIR, f"{comp_name}.tsx")
    
    jsx_text = sec['jsx']
    
    extra_imports = ""
    if comp_name == "ProfileCreatorToolsSection":
        extra_imports += 'import { CREATOR_SUBSCRIPTION_MIN_GD } from "@/lib/creator-experiences";\n'
    if comp_name == "ProfilePrivacyDataSection":
        extra_imports += 'import { PRIVACY_POLICY_LAST_UPDATED } from "@/lib/platform-config";\n'
    if comp_name == "ProfileProfileSection":
        extra_imports += 'import { sanitizeUsername } from "../hooks/useProfileState";\n'

    comp_code = f"""import React from 'react';
import {{ SectionContainer, NavigationRow, ToggleRow, StaticRow, ValueInputRow, RowDivider }} from './ProfilePrimitives';
import type {{ ProfileState }} from '../page';
import {{ Loader2, User, AtSign, Bell, Globe, ShieldAlert, Mail, Camera, LogOut, Download, Trash2, Lock, FileText, CalendarClock, MessageSquare, Sparkles, Wallet, CircleHelp, LifeBuoy, CalendarDays }} from "lucide-react";
import Image from "next/image";
import {{ cn }} from "@/lib/utils";
{extra_imports}
export function {comp_name}({{ state }}: {{ state: ProfileState }}) {{
    const {{
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
        avatarFallback, referralLink, creatorSettingsNotice,
        handleBrowserPushToggle, handleWithdrawOptionalTracking,
        handleDownloadData, handleRequestDeletion,
        handleChangeAvatar, handleSaveCreatorSettings,
        handleSendCreatorBroadcast, handleRequestCreatorPayout,
        updateCreatorSettingsState, setCreatorSettingsState
    }} = state;

    return (
        {jsx_text}
    );
}}
"""
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(comp_code)

print(f"Extracted {len(sections)} sections")
