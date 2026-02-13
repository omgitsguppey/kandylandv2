"use client";

import { useState, useEffect } from "react";
import { ref, listAll, getDownloadURL, deleteObject, uploadBytes } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { Loader2, Upload, Trash2, Copy, FileIcon, Image as ImageIcon, Video, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { format } from "date-fns";

interface StorageFile {
    name: string;
    fullPath: string;
    url: string;
    size?: number;
    contentType?: string;
    timeCreated?: string;
}

export default function ContentManagerPage() {
    const [files, setFiles] = useState<StorageFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    useEffect(() => {
        fetchFiles();
    }, [refreshTrigger]);

    const fetchFiles = async () => {
        setLoading(true);
        try {
            // List all files in 'drops' folder (primary folder)
            const listRef = ref(storage, 'drops');
            const res = await listAll(listRef);

            const filePromises = res.items.map(async (itemRef) => {
                const url = await getDownloadURL(itemRef);
                return {
                    name: itemRef.name,
                    fullPath: itemRef.fullPath,
                    url: url
                };
            });

            const fetchedFiles = await Promise.all(filePromises);
            setFiles(fetchedFiles);
        } catch (error) {
            console.error("Error fetching files:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        setUploading(true);

        try {
            const file = e.target.files[0];
            const storageRef = ref(storage, `drops/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            setRefreshTrigger(prev => prev + 1);
        } catch (error) {
            console.error("Error uploading file:", error);
            alert("Upload failed.");
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (fullPath: string) => {
        if (!confirm("Are you sure you want to permanently delete this file?")) return;
        try {
            const fileRef = ref(storage, fullPath);
            await deleteObject(fileRef);
            setFiles(files.filter(f => f.fullPath !== fullPath));
        } catch (error) {
            console.error("Error deleting file:", error);
            alert("Delete failed.");
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert("URL copied to clipboard!");
    };

    const getFileIcon = (filename: string) => {
        const ext = filename.split('.').pop()?.toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return <ImageIcon className="w-5 h-5 text-brand-pink" />;
        if (['mp4', 'mov', 'webm'].includes(ext || '')) return <Video className="w-5 h-5 text-brand-cyan" />;
        return <FileIcon className="w-5 h-5 text-gray-500" />;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Content Manager</h1>
                    <p className="text-gray-400">Manage assets in Firebase Storage.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="ghost" onClick={() => setRefreshTrigger(prev => prev + 1)}>
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                    <div className="relative">
                        <input
                            type="file"
                            onChange={handleUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            disabled={uploading}
                        />
                        <Button variant="brand" disabled={uploading}>
                            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                            Upload File
                        </Button>
                    </div>
                </div>
            </div>

            <div className="glass-panel rounded-2xl overflow-hidden border border-white/5">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/5 text-gray-400 text-xs uppercase tracking-wider">
                                <th className="p-4 font-medium">Preview</th>
                                <th className="p-4 font-medium">Filename</th>
                                <th className="p-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading && files.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="p-8 text-center">
                                        <Loader2 className="w-6 h-6 text-brand-pink animate-spin mx-auto" />
                                    </td>
                                </tr>
                            ) : files.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="p-8 text-center text-gray-500">
                                        No files found in 'drops' folder.
                                    </td>
                                </tr>
                            ) : (
                                files.map((file) => (
                                    <tr key={file.fullPath} className="hover:bg-white/5 transition-colors">
                                        <td className="p-4 w-20">
                                            <div className="w-12 h-12 rounded-lg bg-black/50 overflow-hidden flex items-center justify-center border border-white/10">
                                                {['jpg', 'jpeg', 'png', 'webp'].some(ext => file.name.toLowerCase().endsWith(ext)) ? (
                                                    <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    getFileIcon(file.name)
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-medium text-white truncate max-w-xs md:max-w-md">{file.name}</div>
                                            <div className="text-xs text-gray-500 font-mono truncate max-w-xs">{file.fullPath}</div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => copyToClipboard(file.url)}
                                                    className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                                                    title="Copy URL"
                                                >
                                                    <Copy className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(file.fullPath)}
                                                    className="p-2 rounded-lg hover:bg-red-500/20 text-red-500 transition-colors"
                                                    title="Delete File"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
