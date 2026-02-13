"use client";

import { useState, useRef } from "react";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { Upload, X, Loader2, FileType, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
    label: string;
    folder: string; // e.g., "drops/images" or "drops/content"
    onUploadComplete: (url: string, metadata?: { size: number, type: string }) => void;
    initialUrl?: string;
    accept?: string; // e.g., "image/*"
    helperText?: string;
}

export function FileUpload({ label, folder, onUploadComplete, initialUrl, accept, helperText }: FileUploadProps) {
    const [progress, setProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(initialUrl || null);
    const [dragActive, setDragActive] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFile = async (file: File) => {
        if (!file) return;

        // Create a unique filename: timestamp_originalName
        const filename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
        const storageRef = ref(storage, `${folder}/${filename}`);

        setIsUploading(true);
        setProgress(0);

        try {
            const uploadTask = uploadBytesResumable(storageRef, file);

            uploadTask.on(
                "state_changed",
                (snapshot) => {
                    const p = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setProgress(p);
                },
                (error) => {
                    console.error("Upload error:", error);
                    alert("Upload failed. Please try again.");
                    setIsUploading(false);
                },
                async () => {
                    const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
                    setPreviewUrl(downloadUrl);
                    onUploadComplete(downloadUrl, { size: file.size, type: file.type });
                    setIsUploading(false);
                }
            );
        } catch (err) {
            console.error("Error starting upload:", err);
            setIsUploading(false);
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const clearFile = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent triggering the file input
        setPreviewUrl(null);
        onUploadComplete("");
        if (inputRef.current) inputRef.current.value = "";
    };

    return (
        <div className="space-y-2">
            <label className="text-sm font-bold text-gray-300 flex items-center gap-2">
                {label}
            </label>

            <div
                className={cn(
                    "relative group cursor-pointer transition-all duration-200 ease-in-out",
                    "border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center",
                    dragActive ? "border-brand-pink bg-brand-pink/5" : "border-white/10 hover:border-white/20 hover:bg-white/5",
                    previewUrl ? "h-64" : "h-32"
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
            >
                <input
                    ref={inputRef}
                    type="file"
                    className="hidden"
                    accept={accept}
                    onChange={handleChange}
                />

                {isUploading ? (
                    <div className="w-full max-w-xs space-y-2">
                        <Loader2 className="w-8 h-8 animate-spin text-brand-pink mx-auto" />
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-brand-pink transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <p className="text-xs text-gray-400">Uploading... {Math.round(progress)}%</p>
                    </div>
                ) : previewUrl ? (
                    <div className="relative w-full h-full flex flex-col items-center justify-center">
                        {accept?.startsWith("image/") ? (
                            <img
                                src={previewUrl}
                                alt="Preview"
                                className="w-full h-full object-contain rounded-lg"
                            />
                        ) : (
                            <div className="flex flex-col items-center gap-2 text-brand-green">
                                <FileType className="w-12 h-12" />
                                <span className="text-sm font-mono truncate max-w-[200px]">{previewUrl.split('/').pop()}</span>
                            </div>
                        )}

                        <button
                            onClick={clearFile}
                            className="absolute -top-2 -right-2 p-1.5 bg-red-500 rounded-full text-white shadow-lg hover:bg-red-600 transition-transform hover:scale-110"
                            title="Remove file"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                            <p className="text-white font-bold text-sm">Click to Replace</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2 pointer-events-none">
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mx-auto">
                            <Upload className="w-5 h-5 text-gray-400" />
                        </div>
                        <div className="text-sm text-gray-400">
                            <span className="text-brand-pink font-bold">Click to upload</span> or drag and drop
                        </div>
                        {helperText && <p className="text-xs text-gray-500">{helperText}</p>}
                    </div>
                )}
            </div>
        </div>
    );
}
