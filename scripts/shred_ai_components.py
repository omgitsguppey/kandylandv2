import os
import re

PAGE_PATH = 'src/app/admin/ai/page.tsx'
COMPS_DIR = 'src/app/admin/ai/components'

os.makedirs(COMPS_DIR, exist_ok=True)

with open(PAGE_PATH, 'r', encoding='utf-8') as f:
    content = f.read()

form_match = re.search(r'(<div className="grid min-w-0 gap-4 xl:grid-cols-12">\n\s*<div className="min-w-0 space-y-4 xl:col-span-7">\n)(.*)(<div className="mt-4 border-t border-white/10 pt-4">)', content, re.DOTALL)
if not form_match:
    print("Could not find the main components section in page!")
    exit(1)

jsx_content = form_match.group(2)
sections_raw = re.split(r'(<AdminDashboardModule)', jsx_content)

sections = []
for i in range(1, len(sections_raw), 2):
    module_start = sections_raw[i] + sections_raw[i+1]
    
    # Extract only until the CLOSING AdminDashboardModule tag
    end_tag = "</AdminDashboardModule>"
    end_idx = module_start.find(end_tag)
    if end_idx != -1:
        module_start = module_start[:end_idx + len(end_tag)]
    
    title_match = re.search(r'title="(.*?)"', module_start)
    title = title_match.group(1) if title_match else "Unknown"

    sections.append({
        "title": title,
        "jsx": module_start.strip()
    })

def sanitize_comp_name(t):
    return "AdminAi" + re.sub(r'[^a-zA-Z0-9]', '', t) + "Section"

for sec in sections:
    comp_name = sanitize_comp_name(sec['title'])
    file_path = os.path.join(COMPS_DIR, f"{comp_name}.tsx")
    
    jsx_text = sec['jsx']

    comp_code = f"""import React from 'react';
import Image from "next/image";
import {{ Activity, CheckCircle2, ChevronRight, Eye, FileWarning, Loader2, Pin, Power, RefreshCw, Sparkles, Trash2, Upload, WandSparkles }} from "lucide-react";
import {{ AdminDashboardModule }} from "@/components/Admin/AdminDashboardModule";
import {{ Button }} from "@/components/ui/Button";
import {{ formatAdminAiUsd }} from "@/lib/ai-drop-covers";
import {{ cn }} from "@/lib/utils";
import {{ Badge, EmptyState, MetricCard, TextAreaBlock, diagnosticTone, formatCompactTimestamp, formatTimestamp, getReferenceSelectionReason, getReferenceSourceLabel, preflightTone, runtimeTone, statTone }} from "./AiHelpers";
import type {{ AdminAiState, ReviewFilter }} from '../hooks/useAdminAiState';
import {{ ADMIN_AI_DROP_COVER_ACTIVE_POLL_INTERVAL_MS, ADMIN_AI_DROP_COVER_IDLE_POLL_INTERVAL_MS }} from "@/lib/ai-drop-covers";

export function {comp_name}({{ state }}: {{ state: AdminAiState }}) {{
    const {{
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
        uiPreferencesData, MODULE_DEFAULTS,
        subtitle, latestDiagnostic, currentVersionJobs, currentVersionAcceptanceRate,
        referencePreview, activeHouseReferences, referenceCap, referenceReuseRate,
        filteredReviewGallery, topFailureReasons,
        persistModuleState, handleToggle, handleDefaultModelChange,
        handleReferenceToggle, handleOptimizerEnabledChange,
        uploadReferences, handleLibraryUploadChange, handlePrimaryUploadChange,
        handleReferenceUpdate, handleReferenceDelete, handleLegacyTemplateDelete,
        handlePromptPolicySave, handleReviewGalleryUpdate
    }} = state;

    return (
        {jsx_text}
    );
}}
"""
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(comp_code)

print(f"Extracted {{len(sections)}} Admin AI sections")
