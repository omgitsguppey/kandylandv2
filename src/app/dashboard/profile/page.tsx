"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { updateProfile } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/Button";
import { Loader2, Save, User } from "lucide-react";

export default function ProfilePage() {
    const { user } = useAuth();
    const [displayName, setDisplayName] = useState(user?.displayName || "");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setLoading(true);
        setMessage(null);

        try {
            // Update Auth Profile
            await updateProfile(user, {
                displayName: displayName
            });

            // Update Firestore User Document
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
                displayName: displayName
            });

            setMessage({ type: 'success', text: "Profile updated successfully!" });
        } catch (error) {
            console.error("Error updating profile:", error);
            setMessage({ type: 'error', text: "Failed to update profile. Please try again." });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <header className="mb-8">
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-pink to-brand-cyan mb-2">
                    Profile Settings
                </h1>
                <p className="text-gray-400">Manage your account information.</p>
            </header>

            <div className="glass-panel p-8 rounded-3xl border border-white/5">
                <div className="flex items-center gap-6 mb-8">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-brand-pink to-brand-purple flex items-center justify-center text-3xl font-bold text-white shadow-2xl">
                        {user?.displayName?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">{user?.displayName}</h2>
                        <p className="text-gray-400">{user?.email}</p>
                    </div>
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                    <div>
                        <label htmlFor="displayName" className="block text-sm font-medium text-gray-300 mb-2">
                            Display Name
                        </label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                            <input
                                type="text"
                                id="displayName"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-brand-pink focus:ring-1 focus:ring-brand-pink transition-all"
                                placeholder="Enter your name"
                            />
                        </div>
                    </div>

                    {message && (
                        <div className={`p-4 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                            {message.text}
                        </div>
                    )}

                    <div className="flex justify-end">
                        <Button
                            type="submit"
                            variant="brand"
                            disabled={loading || displayName === user?.displayName}
                            className="w-full sm:w-auto"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Save Changes
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
