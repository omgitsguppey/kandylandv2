"use client";

import { Section } from "./DebugPrimitives";
import { AdminStatusBadge } from "@/components/Admin/AdminStatusBadge";

/* ─── Props ─── */
export interface DebugTabInfrastructureProps {
    data: any;
}

/* ─── Component ─── */
export function DebugTabInfrastructure({ data }: DebugTabInfrastructureProps) {
    return (
        <div className="space-y-4">
            <Section
                title="Infrastructure Health & Dependencies"
                subtitle="Runtime telemetry showing actual module versions and connection state."
                defaultOpen={true}
            >
                {data?.infrastructure ? (
                    data.infrastructure.error ? (
                        <div className="text-red-400 p-4 bg-red-900/10 border border-red-500/20 rounded font-mono text-xs">
                            [FAILED] {data.infrastructure.error}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-black/20 p-4 rounded border border-white/5">
                                    <h3 className="text-xs uppercase tracking-wider text-white/50 mb-3 border-b border-white/5 pb-2">Environment & Pings</h3>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-white/70">Node Version</span>
                                            <span className="text-xs font-mono text-cyan-400">{data.infrastructure.nodeVersion}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-white/70">Firestore Connectivity</span>
                                            <AdminStatusBadge state={data.infrastructure.pings?.firestore === "live" ? "live" : "failed"} />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-white/70">Last Telemetry Ping</span>
                                            <span className="text-xs font-mono text-white/50">{new Date(data.infrastructure.timestamp || 0).toLocaleTimeString()}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-black/20 p-4 rounded border border-white/5">
                                    <h3 className="text-xs uppercase tracking-wider text-white/50 mb-3 border-b border-white/5 pb-2">Core Dependencies</h3>
                                    <div className="space-y-2">
                                        {Object.entries(data.infrastructure.dependencies || {}).map(([pkg, version]) => (
                                            <div key={pkg} className="flex items-center justify-between">
                                                <span className="text-xs text-white/70">{pkg}</span>
                                                <span className="text-xs font-mono text-green-400">{String(version)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-black/20 p-4 rounded border border-white/5">
                                    <h3 className="text-xs uppercase tracking-wider text-white/50 mb-3 border-b border-white/5 pb-2">Dev Dependencies</h3>
                                    <div className="space-y-2">
                                        {Object.entries(data.infrastructure.devDependencies || {}).map(([pkg, version]) => (
                                            <div key={pkg} className="flex items-center justify-between">
                                                <span className="text-xs text-white/70">{pkg}</span>
                                                <span className="text-xs font-mono text-purple-400">{String(version)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                ) : (
                    <div className="text-white/40 text-sm py-8 text-center italic">
                        Loading infrastructure telemetry...
                    </div>
                )}
            </Section>
        </div>
    );
}
