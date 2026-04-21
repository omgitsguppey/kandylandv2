"use client";

import { useAdminPrivacyPreflight } from "@/hooks/useAdminPrivacyPreflight";
import { ShieldCheck, ShieldAlert, Activity, Clock, Database } from "lucide-react";
import { cn } from "@/lib/utils";

function StatusBadge({ state }: { state: string }) {
  return (
    <span className={cn(
      "px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md border",
      state === "live" ? "bg-green-500/10 text-green-400 border-green-500/20" :
      state === "stale" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
      state === "fallback" ? "bg-orange-500/10 text-orange-400 border-orange-500/20" :
      state === "failed" ? "bg-red-500/10 text-red-400 border-red-500/20" :
      "bg-gray-500/10 text-gray-400 border-gray-500/20"
    )}>
      [{state}]
    </span>
  );
}

export function AdminPrivacyPreflight() {
  const status = useAdminPrivacyPreflight();

  return (
    <div className="rounded-2xl border border-brand-purple/20 bg-brand-purple/5 p-6 mb-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-brand-purple/20 flex items-center justify-center border border-brand-purple/40">
          <ShieldCheck className="w-5 h-5 text-brand-purple" />
        </div>
        <div>
          <h2 className="text-xl font-black text-white">Privacy & Consent Preflight</h2>
          <p className="text-sm text-gray-400">Deterministic view of backend tracking health</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-white/5 bg-black/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Activity className="w-3 h-3" /> Event Pipeline
            </span>
            <StatusBadge state={status.eventsPipeline} />
          </div>
          <div className="text-2xl font-black text-white mt-1">
            {status.lastEventAgeMs < Infinity ? `${Math.round(status.lastEventAgeMs / 1000)}s ago` : "No data"}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-white/5 bg-black/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Database className="w-3 h-3" /> Deduplication
            </span>
            <StatusBadge state={status.dedupeHealth} />
          </div>
          <div className="text-sm text-gray-400 mt-1">
            Backend event uniqueness
          </div>
        </div>

        <div className="p-4 rounded-xl border border-white/5 bg-black/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <ShieldAlert className="w-3 h-3" /> Consent Gating
            </span>
            <StatusBadge state="live" />
          </div>
          <div className="text-2xl font-black text-white mt-1">
            {status.consentRejections} <span className="text-sm font-medium text-gray-500">denied</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-white/5 bg-black/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Clock className="w-3 h-3" /> Guest Tracking
            </span>
            <StatusBadge state={status.globalGuestTracking} />
          </div>
          <div className="text-sm text-gray-400 mt-1">
            Anonymous ID adherence
          </div>
        </div>

        <div className="p-4 rounded-xl border border-white/5 bg-black/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <ShieldCheck className="w-3 h-3 text-blue-400" /> Cloud Run Ingest
            </span>
            <StatusBadge state={status.cloudRunIngest} />
          </div>
          <div className="text-sm text-gray-400 mt-1">
            Canonical origin validation
          </div>
        </div>

        <div className="p-4 rounded-xl border border-white/5 bg-black/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Database className="w-3 h-3 text-purple-400" /> BigQuery Export
            </span>
            <StatusBadge state={status.bqExportHealth} />
          </div>
          <div className="text-sm text-gray-400 mt-1">
            Cold analytics stream
          </div>
        </div>
      </div>
    </div>
  );
}
