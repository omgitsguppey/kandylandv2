"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { User, Calendar, Camera, Check, ShieldCheck, ArrowRight, Sparkles, Loader2 } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { storage } from "@/lib/firebase-data";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { toast } from "sonner";
import { differenceInYears, parseISO } from "date-fns";
import { authFetch } from "@/lib/authFetch";

// Validation Schema
const onboardingSchema = z.object({
    username: z.string()
        .min(3, "Username must be at least 3 characters")
        .regex(/^[a-z0-9_]+$/, "Only lowercase letters, numbers, and underscores"),
    dateOfBirth: z.string().refine((val) => {
        const age = differenceInYears(new Date(), parseISO(val));
        return age >= 18;
    }, "You must be 18+ to join KandyDrops"),
    bio: z.string().optional(),
});

type OnboardingFormData = z.infer<typeof onboardingSchema>;

export function OnboardingModal() {
    const { user, userProfile } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState(1); // 1: Profile, 2: Identity, 3: Creator
    const [loading, setLoading] = useState(false);

    // Avatar state is handled separately as it involves file upload/preview logic
    // that is easier to manage outside of simple text input registration for now,
    // though it could be integrated into RHF if desired.
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

    // Custom check state
    const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
    const [checkingUsername, setCheckingUsername] = useState(false);

    // RHF
    const {
        register,
        handleSubmit,
        watch,
        setValue,
        trigger,
        formState: { errors }
    } = useForm<OnboardingFormData>({
        resolver: zodResolver(onboardingSchema),
        mode: "onChange",
        defaultValues: {
            username: "",
            dateOfBirth: "",
            bio: ""
        }
    });

    const username = watch("username");

    useEffect(() => {
        if (user && userProfile) {
            const missingUsername = !userProfile.username;
            const missingDob = !userProfile.dateOfBirth;

            if (missingUsername || missingDob) {
                setIsOpen(true);
                if (missingUsername && user.displayName) {
                    const clean = user.displayName.replace(/\s+/g, '').toLowerCase();
                    setValue("username", clean);
                    checkUsernameAvailability(clean);
                }
            } else {
                setIsOpen(false);
            }
        }
    }, [user, userProfile, setValue]);

    // Real-time username availability check debounced/triggered manually on change
    const checkUsernameAvailability = async (val: string) => {
        if (!val || val.length < 3) {
            setUsernameAvailable(null);
            return;
        }

        // Basic pattern check before server check
        if (!/^[a-z0-9_]+$/.test(val)) return;

        setCheckingUsername(true);
        try {
            const response = await fetch("/api/user/check-username?username=" + encodeURIComponent(val));
            const result = await response.json();
            setUsernameAvailable(result.available);
        } catch (error) {
            console.error(error);
        } finally {
            setCheckingUsername(false);
        }
    };

    // Watch username for changes to trigger availability check
    useEffect(() => {
        const timer = setTimeout(() => {
            if (username) checkUsernameAvailability(username);
        }, 500);
        return () => clearTimeout(timer);
    }, [username]);

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

    const nextStep = async () => {
        let valid = false;
        if (step === 1) {
            valid = await trigger("username");
            if (valid && usernameAvailable === false) {
                // RHF valid doesn't know about DB uniqueness, so we block here
                return;
            }
        } else if (step === 2) {
            valid = await trigger("dateOfBirth");
        }

        if (valid) setStep(prev => prev + 1);
    };

    const onSubmit = async (data: OnboardingFormData) => {
        if (!user) return;
        setLoading(true);

        try {
            let photoURL = userProfile?.photoURL;

            // Upload Avatar if changed (stays client-side — needs file access)
            if (avatarFile) {
                const storageRef = ref(storage, `users/${user.uid}/avatar_${Date.now()}`);
                await uploadBytes(storageRef, avatarFile);
                photoURL = await getDownloadURL(storageRef);
            }

            // Submit to server API
            const response = await authFetch("/api/user/profile", {
                method: "POST",
                body: JSON.stringify({
                    username: !userProfile?.username ? data.username : undefined,
                    dateOfBirth: !userProfile?.dateOfBirth ? data.dateOfBirth : undefined,
                    bio: data.bio,
                    photoURL,
                }),
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Profile save failed");

            toast.success("Profile Setup Complete!", { icon: "🎉" });
            setIsOpen(false);

        } catch (error: any) {
            console.error("Onboarding Error:", error);
            toast.error(error.message || "Failed to save profile.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="w-full max-w-lg bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">

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
                    <form onSubmit={handleSubmit(onSubmit)}>

                        {/* Step 1: Profile & Username */}
                        <div className={step === 1 ? "block space-y-6" : "hidden"}>
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
                                        <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity cursor-pointer rounded-full">
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
                                            {...register("username")}
                                            type="text"
                                            className={`w-full bg-black/50 border rounded-xl px-8 py-3 text-white focus:outline-none transition-all ${errors.username ? "border-red-500" : usernameAvailable === true ? "border-green-500/50 focus:border-green-500" : "border-white/10 focus:border-brand-pink" }`}
                                            placeholder="username"
                                        />
                                        {checkingUsername && (
                                            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                                        )}
                                    </div>
                                    {errors.username && (
                                        <p className="text-xs text-red-400">{errors.username.message}</p>
                                    )}
                                    {!errors.username && usernameAvailable === false && (
                                        <p className="text-xs text-red-400">Username already taken.</p>
                                    )}
                                    {!errors.username && usernameAvailable === true && (
                                        <p className="text-xs text-green-400">Username available!</p>
                                    )}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={nextStep}
                                className="w-full py-4 bg-white text-black font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                                Next Step <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Step 2: Identity */}
                        <div className={step === 2 ? "block space-y-6" : "hidden"}>
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
                                            {...register("dateOfBirth")}
                                            type="date"
                                            className="w-full bg-black/50 border border-white/10 rounded-xl px-12 py-3 text-white focus:outline-none focus:border-brand-pink transition-all [color-scheme:dark]"
                                        />
                                    </div>
                                    {errors.dateOfBirth && (
                                        <p className="text-xs text-red-400">{errors.dateOfBirth.message}</p>
                                    )}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={nextStep}
                                className="w-full py-4 bg-white text-black font-bold rounded-xl transition-colors"
                            >
                                Continue
                            </button>
                        </div>

                        {/* Step 3: Creator */}
                        <div className={step === 3 ? "block space-y-6" : "hidden"}>
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-white">Add a Bio (Optional)</h3>
                                <p className="text-sm text-gray-400">Tell others a bit about yourself.</p>
                                <textarea
                                    {...register("bio")}
                                    placeholder="I love synthwave and neon lights..."
                                    rows={4}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-brand-pink transition-all resize-none"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-gradient-to-r from-brand-pink to-brand-purple text-white font-bold rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Complete Setup"}
                            </button>
                        </div>

                    </form>
                </div>
            </div>
        </div>
    );
}
