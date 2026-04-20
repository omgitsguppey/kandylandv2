import os

PAGE_PATH = r'C:\Users\uylus\OneDrive\Documents\KandyDrops_Final\src\app\dashboard\profile\page.tsx'

content = """"use client";

import { useProfileState } from "./hooks/useProfileState";
import { ProfileProfileSection } from "./components/ProfileProfileSection";
import { ProfileAccountSection } from "./components/ProfileAccountSection";
import { ProfileNotificationsSection } from "./components/ProfileNotificationsSection";
import { ProfilePrivacyDataSection } from "./components/ProfilePrivacyDataSection";
import { ProfileCreatorEarningsSection } from "./components/ProfileCreatorEarningsSection";
import { ProfileCreatorToolsSection } from "./components/ProfileCreatorToolsSection";
import { ProfileSupportSafetySection } from "./components/ProfileSupportSafetySection";
import { CreateDropModal } from "@/components/Admin/CreateDropModal";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export type ProfileState = ReturnType<typeof useProfileState>;

export default function ProfilePage() {
    const state = useProfileState();

    if (!state.userProfile) {
        return (
            <div className="flex h-[200px] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-brand-purple" />
            </div>
        );
    }

    return (
        <div className="mx-auto w-full max-w-lg bg-black min-h-screen pb-32">
            {/* Header omitted or simplified */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-black/80 px-4 py-3 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-brand-purple/20 flex items-center justify-center">
                        <span className="text-sm font-bold text-brand-purple">{state.avatarFallback}</span>
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-white tracking-tight leading-none">{state.profileName}</h1>
                        <p className="text-[10px] text-gray-400 font-medium mt-0.5">{state.profileEmail}</p>
                    </div>
                </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); }} className="space-y-4 pt-4">
                <ProfileProfileSection state={state} />
                <ProfileAccountSection state={state} />
                <ProfileNotificationsSection state={state} />
                <ProfilePrivacyDataSection state={state} />
                
                {state.isCreatorAccount && <ProfileCreatorEarningsSection state={state} />}
                {state.isCreatorAccount && <ProfileCreatorToolsSection state={state} />}

                <ProfileSupportSafetySection state={state} />
            </form>

            {state.isCreatorAccount && (
                <CreateDropModal
                    isOpen={state.creatorDropModalOpen}
                    onClose={() => state.setCreatorDropModalOpen(false)}
                    onSuccess={() => {
                        state.setCreatorDropModalOpen(false);
                        toast.success("Creator drop submitted for admin review.");
                    }}
                    mode="creator"
                    creatorIdOverride={state.user?.uid || null}
                />
            )}
        </div>
    );
}
"""

with open(PAGE_PATH, 'w', encoding='utf-8') as f:
    f.write(content)

print("page.tsx rewritten")
