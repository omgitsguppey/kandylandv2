"use client";

import { useState, useEffect } from "react";
import { useAuth, useUserProfile } from "@/context/AuthContext";
import { updateProfile } from "firebase/auth";
import { Button } from "@/components/ui/Button";
import { Loader2, Save, User, AtSign, Bell, BellOff } from "lucide-react";

import { authFetch } from "@/lib/authFetch";
import { toast } from "sonner";
import Image from "next/image";

export default function ProfilePage() {
    const { user } = useAuth();
    const { userProfile } = useUserProfile();
    const [displayName, setDisplayName] = useState("");
    const [username, setUsername] = useState("");
    const [inAppEnabled, setInAppEnabled] = useState(true);
    const [browserPushEnabled, setBrowserPushEnabled] = useState(false);

    useEffect(() => {
        if (userProfile) {
            setDisplayName(userProfile.displayName || "");
            setUsername(userProfile.username || "");
            setInAppEnabled(userProfile.notificationSettings?.inAppEnabled !== false);
            setBrowserPushEnabled(userProfile.notificationSettings?.browserPushEnabled === true);
        } else if (user) {
            setDisplayName(user.displayName || "");
        }
    }, [userProfile, user]);

    const [loading, setLoading] = useState(false);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setLoading(true);

        try {
            await updateProfile(user, { displayName: displayName.trim() });

            const response = await authFetch("/api/user/profile", {
                method: "PUT",
                body: JSON.stringify({
                    displayName,
                    username,
                    notificationSettings: {
                        inAppEnabled,
                        browserPushEnabled,
                    },
                }),
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error);

            toast.success("Profile updated successfully!");
        } catch (error: any) {
            console.error("Error updating profile:", error);
            toast.error(error.message || "Failed to update profile");
        } finally {
            setLoading(false);
        }
    };

    const requestBrowserNotifications = async () => {
        if (!("Notification" in window)) {
            toast.error("Browser notifications are not supported on this device.");
            return;
        }

        const permission = await Notification.requestPermission();
        if (permission === "granted") {
            setBrowserPushEnabled(true);
            toast.success("Browser notifications enabled.");
        } else {
            setBrowserPushEnabled(false);
            toast.info("Browser notifications were not enabled.");
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <header className="mb-8">
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-pink to-brand-cyan mb-2">Profile Settings</h1>
                <p className="text-gray-400">Manage identity, tracking, and notification preferences.</p>
            </header>

            <div className="glass-panel p-8 rounded-3xl border border-white/5">
                <div className="flex items-center gap-6 mb-8">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-brand-pink to-brand-purple flex items-center justify-center text-3xl font-bold text-white shadow-2xl relative overflow-hidden">
                        {user?.photoURL ? (
                            <Image src={user.photoURL} alt="Avatar" fill sizes="80px" className="object-cover" />
                        ) : (
                            user?.displayName?.charAt(0).toUpperCase() || "U"
                        )}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">{displayName || user?.displayName}</h2>
                        <p className="text-gray-400">{user?.email}</p>
                    </div>
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                    <div>
                        <label htmlFor="displayName" className="block text-sm font-medium text-gray-300 mb-2">Display Name</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                            <input type="text" id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white" placeholder="Enter your name" />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">Username (source of truth)</label>
                        <div className="relative">
                            <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                            <input type="text" id="username" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ""))} className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white" placeholder="your_handle" />
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Used for creator URLs, identity consistency, and event attribution.</p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/30 p-4 space-y-4">
                        <h3 className="text-white font-semibold">Notification & tracking management</h3>

                        <label className="flex items-center justify-between gap-4">
                            <span className="text-sm text-gray-300 flex items-center gap-2"><Bell className="w-4 h-4" /> In-app notifications</span>
                            <input type="checkbox" checked={inAppEnabled} onChange={(e) => setInAppEnabled(e.target.checked)} />
                        </label>

                        <label className="flex items-center justify-between gap-4">
                            <span className="text-sm text-gray-300 flex items-center gap-2"><Bell className="w-4 h-4" /> Browser/PWA notifications</span>
                            <input type="checkbox" checked={browserPushEnabled} onChange={(e) => setBrowserPushEnabled(e.target.checked)} />
                        </label>

                        {browserPushEnabled ? (
                            <Button type="button" variant="glass" onClick={requestBrowserNotifications}>Enable Notifications in Browser</Button>
                        ) : (
                            <p className="text-xs text-gray-500 flex items-start gap-2"><BellOff className="w-3.5 h-3.5 mt-0.5" /> If notifications stay off, disable them in browser settings: <a href="https://support.google.com/chrome/answer/3220216" target="_blank" className="underline">Chrome</a> / <a href="https://support.apple.com/guide/safari/customize-website-notifications-sfri40734/mac" target="_blank" className="underline">Safari</a>.</p>
                        )}
                    </div>

                    <div className="flex justify-end">
                        <Button type="submit" variant="brand" disabled={loading} className="w-full sm:w-auto font-bold tracking-wide">
                            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><Save className="w-4 h-4 mr-2" />Save Changes</>}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
