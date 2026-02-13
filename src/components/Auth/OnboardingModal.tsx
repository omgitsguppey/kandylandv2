"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Calendar, Camera, Check, ShieldCheck, ArrowRight, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { doc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { toast } from "sonner";
import { differenceInYears, parseISO } from "date-fns";
import { Loader2 } from "lucide-react";

export function OnboardingModal() {
    const { user, userProfile } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState(1); // 1: Profile, 2: Identity, 3: Creator (Optional)
    const [loading, setLoading] = useState(false);

    // Form State
    const [username, setUsername] = useState("");
    const [dateOfBirth, setDateOfBirth] = useState("");
    const [bio, setBio] = useState("");
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

    // Validation State
    const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
    const [checkingUsername, setCheckingUsername] = useState(false);

    useEffect(() => {
        if (user && userProfile) {
            // Check if critical info is missing
            const missingUsername = !userProfile.username;
            const missingDob = !userProfile.dateOfBirth;

            if (missingUsername || missingDob) {
                setIsOpen(true);
                // Pre-fill if available (e.g. from Google displayName, though we want unique handles)
                if (missingUsername && user.displayName) {
                    setUsername(user.displayName.replace(/\s+/g, '').toLowerCase());
                }
            } else {
                setIsOpen(false);
            }
        }
    }, [user, userProfile]);

    const checkUsername = async (val: string) => {
        if (val.length < 3) {
            setUsernameAvailable(null);
            return;
        }
        setCheckingUsername(true);
        // Simple standardization
        const clean = val.toLowerCase().replace(/[^a-z0-9_]/g, "");
        setUsername(clean);

        try {
            const q = query(collection(db, "users"), where("username", "==", clean));
            const snap = await getDocs(q);
            // Available if empty OR if it's already ME (unlikely in this flow but good safety)
            setUsernameAvailable(snap.empty);
        } catch (error) {
            console.error(error);
        } finally {
            setCheckingUsername(false);
        }
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 5 * 1024 * 1024) {
                toast.error("Image must be smaller than 5MB");
                return;
            }
            setAvatarFile(file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const handleStep1Submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!usernameAvailable && !userProfile?.username) return; // Allow if merely updating
        setStep(2);
    };

    const handleStep2Submit = async (e: React.FormEvent) => {
        e.preventDefault();
        const age = differenceInYears(new Date(), parseISO(dateOfBirth));
        if (age < 18) {
            toast.error("You must be 18+ to use KandyDrops.");
            return;
        }
        setStep(3);
    };

    const handleFinalSubmit = async () => {
        if (!user) return;
        setLoading(true);

        try {
            let photoURL = userProfile?.photoURL;

            // Upload Avatar if changed
            if (avatarFile) {
                const storageRef = ref(storage, `users/${user.uid}/avatar_${Date.now()}`);
                await uploadBytes(storageRef, avatarFile);
                photoURL = await getDownloadURL(storageRef);
            }

            // Update Firestore
            const updates: any = {};
            if (!userProfile?.username) updates.username = username;
            if (!userProfile?.dateOfBirth) updates.dateOfBirth = dateOfBirth;
            if (photoURL) updates.photoURL = photoURL;
            if (bio) updates.bio = bio;

            // Set 'user' role implicitly if undefined, logic can handle promotions later

            await updateDoc(doc(db, "users", user.uid), updates);

            toast.success("Profile Setup Complete!", { icon: "🎉" });
            setIsOpen(false);

        } catch (error) {
            console.error("Onboarding Error:", error);
            toast.error("Failed to save profile.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    className="w-full max-w-lg bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="p-8 border-b border-white/5 bg-gradient-to-r from-brand-pink/10 to-transparent">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-brand-pink/20 rounded-lg">
                                <Sparkles className="w-6 h-6 text-brand-pink" />
                            </div>
                            <h2 className="text-2xl font-bold text-white">Welcome to KandyDrops</h2>
                        </div>
                        <p className="text-gray-400">Let's set up your profile to get you started.</p>

                        {/* Progress */}
                        <div className="flex gap-2 mt-6">
                            {[1, 2, 3].map((s) => (
                                <div
                                    key={s}
                                    className={`h-1 flex-1 rounded-full transition-colors ${s <= step ? 'bg-brand-pink' : 'bg-white/10'}`}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-8 overflow-y-auto">
                        {step === 1 && (
                            <form onSubmit={handleStep1Submit} className="space-y-6">
                                <div className="space-y-4">
                                    <div className="flex justify-center">
                                        <div className="relative group">
                                            <div className="w-24 h-24 rounded-full overflow-hidden bg-black border-2 border-white/10 flex items-center justify-center">
                                                {avatarPreview || user?.photoURL ? (
                                                    <img src={avatarPreview || user?.photoURL || ""} alt="Avatar" className="w-full h-full object-cover" />
                                                ) : (
                                                    <User className="w-10 h-10 text-gray-500" />
                                                )}
                                            </div>
                                            <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full">
                                                <Camera className="w-6 h-6 text-white" />
                                                <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                                            </label>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-300">Choose a Username</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">@</span>
                                            <input
                                                type="text"
                                                value={username}
                                                onChange={(e) => checkUsername(e.target.value)}
                                                className={`w-full bg-black/50 border rounded-xl px-8 py-3 text-white focus:outline-none transition-all ${usernameAvailable === true ? "border-green-500/50 focus:border-green-500" :
                                                        usernameAvailable === false ? "border-red-500/50 focus:border-red-500" :
                                                            "border-white/10 focus:border-brand-pink"
                                                    }`}
                                                placeholder="username"
                                                required
                                            />
                                            {checkingUsername && (
                                                <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                                            )}
                                        </div>
                                        {usernameAvailable === false && (
                                            <p className="text-xs text-red-400">Username already taken.</p>
                                        )}
                                        {usernameAvailable === true && (
                                            <p className="text-xs text-green-400">Username available!</p>
                                        )}
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={!username || usernameAvailable === false}
                                    className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    Next Step <ArrowRight className="w-4 h-4" />
                                </button>
                            </form>
                        )}

                        {step === 2 && (
                            <form onSubmit={handleStep2Submit} className="space-y-6">
                                <div className="space-y-4">
                                    <div className="p-4 bg-brand-pink/10 rounded-xl border border-brand-pink/20 flex gap-3">
                                        <ShieldCheck className="w-6 h-6 text-brand-pink shrink-0" />
                                        <p className="text-sm text-brand-pink/80">
                                            We need your birth date to comply with age restrictions. This will not be public.
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-300">Date of Birth</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                            <input
                                                type="date"
                                                value={dateOfBirth}
                                                onChange={(e) => setDateOfBirth(e.target.value)}
                                                className="w-full bg-black/50 border border-white/10 rounded-xl px-12 py-3 text-white focus:outline-none focus:border-brand-pink transition-all [color-scheme:dark]"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>
                                <button type="submit" className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors">
                                    Continue
                                </button>
                            </form>
                        )}

                        {step === 3 && (
                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <h3 className="text-lg font-bold text-white">Add a Bio (Optional)</h3>
                                    <p className="text-sm text-gray-400">Tell others a bit about yourself.</p>
                                    <textarea
                                        value={bio}
                                        onChange={(e) => setBio(e.target.value)}
                                        placeholder="I love synthwave and neon lights..."
                                        rows={4}
                                        className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-brand-pink transition-all resize-none"
                                    />
                                </div>
                                <button
                                    onClick={handleFinalSubmit}
                                    disabled={loading}
                                    className="w-full py-4 bg-gradient-to-r from-brand-pink to-brand-purple text-white font-bold rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Complete Setup"}
                                </button>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
