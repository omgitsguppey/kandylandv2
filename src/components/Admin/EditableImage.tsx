"use client";

import { useState, useRef, useEffect } from "react";
import NextImage from "next/image";
import { useAuth } from "@/context/AuthContext";
import { Camera, Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface EditableImageProps {
    id: string; // Used as the key in the Firestore settings document
    defaultSrc: string;
    alt: string;
    className?: string;
    width?: number;
    height?: number;
    fill?: boolean;
    sizes?: string;
    priority?: boolean;
}

export function EditableImage({ id, defaultSrc, alt, className, width, height, fill, sizes, priority }: EditableImageProps) {
    const { userProfile, user } = useAuth();
    const [currentSrc, setCurrentSrc] = useState(defaultSrc);
    const [isHovering, setIsHovering] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isAdmin = userProfile?.role === "admin";

    // Load initial source from settings API if exists
    useEffect(() => {
        let mounted = true;
        const loadCustomImage = async () => {
            try {
                const res = await fetch(`/api/settings/landing?key=${id}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.url && mounted) {
                        setCurrentSrc(data.url);
                    }
                }
            } catch (err) {
                console.error("Failed to load custom image for", id, err);
            }
        };
        loadCustomImage();
        return () => { mounted = false; };
    }, [id]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !isAdmin) return;

        // Basic validation (e.g., allow GIFs, max 10MB to support animations)
        if (file.size > 10 * 1024 * 1024) {
            toast.error("File is too large. Maximum size is 10MB for landing page media.");
            return;
        }

        setIsUploading(true);
        const tempUrl = URL.createObjectURL(file);
        setCurrentSrc(tempUrl);

        try {
            const token = await user?.getIdToken();
            const formData = new FormData();
            formData.append("file", file);
            formData.append("key", id);

            const res = await fetch("/api/settings/landing/upload", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`
                },
                body: formData,
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Failed to upload image.");
            }

            const data = await res.json();
            setCurrentSrc(data.url); // Set to final CDN url
            toast.success("Image updated successfully.");
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "An error occurred during upload.");
            setCurrentSrc(defaultSrc); // Reset on failure
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    return (
        <div
            className={cn("relative group overflow-hidden block", className, !fill && "inline-block")}
            onMouseEnter={() => setIsHovering(true && isAdmin)}
            onMouseLeave={() => setIsHovering(false)}
        >
            {fill ? (
                <NextImage
                    src={currentSrc}
                    alt={alt}
                    fill
                    sizes={sizes}
                    priority={priority}
                    className="object-cover transition-opacity duration-300"
                    unoptimized={currentSrc.endsWith(".gif") || currentSrc.startsWith("blob:")}
                />
            ) : (
                <NextImage
                    src={currentSrc}
                    alt={alt}
                    width={width || 500}
                    height={height || 500}
                    priority={priority}
                    className="w-full h-auto transition-opacity duration-300"
                    unoptimized={currentSrc.endsWith(".gif") || currentSrc.startsWith("blob:")}
                />
            )}

            {/* Admin Overlay UI */}
            {isAdmin && (
                <div
                    className={cn(
                        "absolute inset-0 bg-black/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center transition-opacity duration-200",
                        isHovering || isUploading ? "opacity-100" : "opacity-0"
                    )}
                >
                    {isUploading ? (
                        <div className="flex flex-col items-center gap-2">
                            <Loader2 className="w-8 h-8 text-brand-purple animate-spin" />
                            <span className="text-white text-xs font-bold leading-none tracking-wider">UPLOADING</span>
                        </div>
                    ) : (
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-brand-purple/90 hover:bg-white text-black font-bold p-3 rounded-full shadow-2xl transition-all transform hover:scale-110 flex items-center gap-2"
                        >
                            <Camera className="w-5 h-5 shrink-0" />
                            <span className="text-sm px-1 font-extrabold pr-2">Replace</span>
                        </button>
                    )}
                    <input
                        type="file"
                        accept="image/png, image/jpeg, image/gif, image/webp"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                    />
                </div>
            )}
        </div>
    );
}
