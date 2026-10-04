"use client";

import { type ChangeEvent, useEffect, useState } from "react";

import { PageViewEvent } from "@/components/Analytics/PageViewEvent";
import { AdminContentAssetConsole, type AdminContentAsset } from "@/components/creative-tim/kandydrops/admin/content/AdminContentAssetConsole";
import { useAuth } from "@/context/AuthContext";
import { isAdminUiTestSessionUser } from "@/lib/admin/admin-ui-test-session";
import { authFetch } from "@/lib/authFetch";
import { reportClientIssue } from "@/lib/client-error-reporting";
import { sanitizeErrorForUser } from "@/lib/errors/resolve-human-error";
import { toast } from "sonner";

function getAdminContentSafeErrorMessage(error: unknown, fallback: string) {
    const safeError = sanitizeErrorForUser(error, "admin_truth", "admin_truth_unavailable");
    return safeError.errorKey === "unknown_error" ? fallback : safeError.operatorMessage;
}

export default function ContentManagerPage() {
    const { user } = useAuth();
    const [files, setFiles] = useState<AdminContentAsset[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const isLocalAdminUiTestSession = isAdminUiTestSessionUser(user);

    useEffect(() => {
        if (isLocalAdminUiTestSession) {
            setLoading(false);
            setFiles([]);
            setError(null);
            return;
        }
        void fetchFiles();
    }, [refreshTrigger, isLocalAdminUiTestSession]);

    const fetchFiles = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await authFetch("/api/admin/content", { cache: "no-store" });
            const payload = await response.json() as { error?: string; files?: AdminContentAsset[] };
            if (!response.ok) {
                throw new Error(payload.error || "Failed to load content files.");
            }

            setFiles(Array.isArray(payload.files) ? payload.files : []);
        } catch (error) {
            reportClientIssue({
                channel: "network",
                message: "Admin content fetch failed",
                error,
                detail: {
                    action: "fetch_files",
                },
                consoleLabel: "[Admin Content] fetch files failed",
            });
            setError(getAdminContentSafeErrorMessage(error, "Failed to load content files."));
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
        if (isLocalAdminUiTestSession) {
            event.target.value = "";
            return;
        }
        if (!event.target.files || event.target.files.length === 0) return;
        setUploading(true);
        setError(null);

        try {
            const file = event.target.files[0];
            const formData = new FormData();
            formData.append("file", file);

            const response = await authFetch("/api/admin/content", {
                method: "POST",
                body: formData,
            });
            const payload = await response.json() as { error?: string; file?: AdminContentAsset };
            const uploadedFile = payload.file;
            if (!response.ok || !uploadedFile) {
                throw new Error(payload.error || "Upload failed.");
            }

            setFiles((current) => [uploadedFile, ...current.filter((entry) => entry.id !== uploadedFile.id)]);
            toast.success("File uploaded.");
        } catch (error) {
            reportClientIssue({
                channel: "network",
                message: "Admin content upload failed",
                error,
                detail: {
                    action: "upload_file",
                },
                consoleLabel: "[Admin Content] upload failed",
            });
            const message = getAdminContentSafeErrorMessage(error, "Upload failed.");
            setError(message);
            toast.error(message);
        } finally {
            setUploading(false);
            event.target.value = "";
        }
    };

    const handleDelete = async (fileId: string) => {
        if (isLocalAdminUiTestSession) return;
        if (!confirm("Are you sure you want to permanently delete this file?")) return;
        setError(null);
        try {
            const response = await authFetch("/api/admin/content", {
                method: "DELETE",
                body: JSON.stringify({ fileId }),
            });
            const payload = await response.json() as { error?: string };
            if (!response.ok) {
                throw new Error(payload.error || "Delete failed.");
            }

            setFiles((current) => current.filter((file) => file.id !== fileId));
            toast.success("File deleted.");
        } catch (error) {
            reportClientIssue({
                channel: "network",
                message: "Admin content delete failed",
                error,
                detail: {
                    action: "delete_file",
                    fileId,
                },
                consoleLabel: "[Admin Content] delete failed",
            });
            const message = getAdminContentSafeErrorMessage(error, "Delete failed.");
            setError(message);
            toast.error(message);
        }
    };

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success("URL copied to clipboard.");
        } catch (error) {
            reportClientIssue({
                channel: "ui",
                severity: "warn",
                message: "Admin content clipboard copy failed",
                error,
                detail: {
                    action: "copy_asset_url",
                },
                consoleLabel: "[Admin Content] clipboard copy failed",
            });
            const message = getAdminContentSafeErrorMessage(error, "Failed to copy URL.");
            setError(message);
            toast.error(message);
        }
    };

    return (
        <>
            <PageViewEvent eventName="admin_content_viewed" />
            <AdminContentAssetConsole
                files={files}
                loading={loading}
                uploading={uploading}
                error={error}
                isFixture={isLocalAdminUiTestSession}
                onRefresh={() => setRefreshTrigger((previous) => previous + 1)}
                onUpload={handleUpload}
                onDelete={handleDelete}
                onCopyUrl={copyToClipboard}
            />
        </>
    );
}