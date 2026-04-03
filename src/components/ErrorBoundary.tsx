"use client";

import { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { recordClientError } from "@/lib/client-diagnostics";
import { ReportBugButton } from "@/components/Feedback/ReportBugButton";


interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        recordClientError(error, {
            componentStack: errorInfo.componentStack ?? undefined,
            source: "error_boundary",
        });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-black text-white p-4">
                    <div className="max-w-md w-full bg-zinc-900 border border-white/10 rounded-2xl p-8 text-center shadow-2xl">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 mb-6">
                            <AlertCircle className="w-8 h-8 text-red-500" />
                        </div>
                        <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
                        <p className="text-gray-400 mb-6">
                            We encountered an unexpected error. Please try reloading.
                        </p>

                        {this.state.error && (
                            <div className="bg-black/50 p-4 rounded-lg text-left mb-6 overflow-auto max-h-40 border border-white/5">
                                <p className="font-mono text-xs text-red-400 break-all">
                                    {this.state.error.message}
                                </p>
                            </div>
                        )}

                        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                            <button
                                onClick={() => window.location.reload()}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 font-bold text-black transition-colors"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Reload Page
                            </button>
                            <div className="inline-flex justify-center">
                                <ReportBugButton context="error-boundary" label="Report this issue" variant="pill" />
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
