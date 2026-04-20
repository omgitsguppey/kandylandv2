import os
import re

PAGE_PATH = 'src/app/admin/ai/page.tsx'
HOOKOS_PATH = 'src/app/admin/ai/hooks/useAdminAiState.tsx'

os.makedirs(os.path.dirname(HOOKOS_PATH), exist_ok=True)

with open(PAGE_PATH, 'r', encoding='utf-8') as f:
    content = f.read()

# match everything up to export default function
pre_func_match = re.search(r'(.*?)export default function AIAdminPage\(\) \{', content, re.DOTALL)
pre_func = pre_func_match.group(1).replace('"use client";\n', '')

# match everything from function start to return (
body_match = re.search(r'export default function AIAdminPage\(\) \{(.*?)\n    return \(', content, re.DOTALL)
body = body_match.group(1)

# Extract local variables and functions to export
state_vars = []
for line in body.split('\n'):
    line = line.strip()
    if line.startswith('const [') or line.startswith('const {') or line.startswith('const '):
        # e.g., const [foo, setFoo] = ...
        # const { data, error } = ...
        # const handleFoo = ...
        if line.startswith('const ['):
            m = re.match(r'const \[([\w\s,]+)\]\s*=', line)
            if m:
                state_vars.extend([v.strip() for v in m.group(1).split(',')])
        elif line.startswith('const {'):
            m = re.match(r'const \{([\w\s,:]+)\}\s*=', line)
            if m:
                # remove aliases (e.g. data: uiPreferencesData -> data)
                # wait, let's just grab the whole block safely. For now I'll do this manually in JS
                pass
        else:
            m = re.match(r'const ([\w]+)\s*=', line)
            if m:
                state_vars.append(m.group(1))

c = f"""import {{ useEffect, useMemo, useRef, useState, type ChangeEvent }} from "react";
import {{ useAdminPollingSWR }} from "@/hooks/useAdminPollingSWR";
import {{ authFetch }} from "@/lib/authFetch";
import {{ reportClientIssue }} from "@/lib/client-error-reporting";
import {{ toast }} from "sonner";
import {{
    ADMIN_AI_DROP_COVER_ACTIVE_POLL_INTERVAL_MS,
    ADMIN_AI_DROP_COVER_IDLE_POLL_INTERVAL_MS,
    type AdminAiDropCoverJobRecord,
    type AdminAiDropCoverModelHealth,
    type AdminAiDropCoverPreflightCheck,
    type AdminAiDropCoverPromptPolicy,
    type AdminAiDropCoverPromptPolicyHistoryEntry,
    type AdminAiDropCoverReferenceAsset,
    type AdminAiDropCoverReviewGalleryItem,
    type AdminAiDropCoverRuntimeDiagnostic,
    type AdminAiDropCoverRuntimeStatus,
    type AdminAiDropCoverSelectableModel,
    type AdminAiDropCoverSettings,
    type AdminAiDropCoverVisualSignalSummary,
}} from "@/lib/ai-drop-covers";
import {{ parseMultilineInput }} from "../components/AiHelpers";

{pre_func.replace('import {\\n    Badge,', '/*').replace('from "./AiHelpers";', '*/')}

export function useAdminAiState() {{
{body}

    return {{
        refreshIntervalMs, setRefreshIntervalMs,
        updatingToggle, setUpdatingToggle,
        savingModelId, setSavingModelId,
        savingReferenceSettings, setSavingReferenceSettings,
        savingPromptPolicy, setSavingPromptPolicy,
        uploadingLibrary, setUploadingLibrary,
        uploadingPrimary, setUploadingPrimary,
        updatingReferenceId, setUpdatingReferenceId,
        removingReferenceId, setRemovingReferenceId,
        reviewingJobId, setReviewingJobId,
        galleryFilter, setGalleryFilter,
        moduleOpenState, setModuleOpenState,
        policyDraft, setPolicyDraft,
        policyDirty, setPolicyDirty,
        libraryInputRef, primaryInputRef,
        data, error, isLoading, mutate,
        uiPreferencesData,
        subtitle, latestDiagnostic, currentVersionJobs, currentVersionAcceptanceRate,
        referencePreview, activeHouseReferences, referenceCap, referenceReuseRate,
        filteredReviewGallery, topFailureReasons,
        persistModuleState, handleToggle, handleDefaultModelChange,
        handleReferenceToggle, handleOptimizerEnabledChange,
        uploadReferences, handleLibraryUploadChange, handlePrimaryUploadChange,
        handleReferenceUpdate, handleReferenceDelete, handleLegacyTemplateDelete,
        handlePromptPolicySave, handleReviewGalleryUpdate
    }};
}}

export type AdminAiState = ReturnType<typeof useAdminAiState>;
"""

with open(HOOKOS_PATH, 'w', encoding='utf-8') as f:
    f.write(c)

print("Created " + HOOKOS_PATH)
