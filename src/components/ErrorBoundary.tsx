"use client";

import { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { recordClientError } from "@/lib/client-diagnostics";
import { ReportBugButton } from "@/components/Feedback/ReportBugButton";
import { getPageProblemCopy } from "@/lib/problem-state-copy";


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
            const problemCopy = getPageProblemCopy(this.state.error);

            return (
                <div className="min-h-screen flex items-center justify-center bg-black text-white p-4">
                    <div className="max-w-md w-full bg-zinc-900 border border-white/10 rounded-2xl p-8 text-center shadow-2xl">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 mb-6">
                            <AlertCircle className="w-8 h-8 text-red-500" />
                        </div>
                        <h1 className="mb-2 text-2xl font-bold">{problemCopy.headline}</h1>
                        <p className="text-gray-400 mb-6">
                            {problemCopy.body}
                        </p>

                        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                            <button
                                onClick={() => window.location.reload()}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 font-bold text-black transition-colors"
                            >
                                <RefreshCw className="w-4 h-4" />
                                {problemCopy.actionLabel}
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
