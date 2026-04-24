"use client";

import { useAdminPrivacyPreflight } from "@/hooks/useAdminPrivacyPreflight";
import { ShieldCheck, ShieldAlert, Activity, Clock, Database, Cloud } from "lucide-react";
import { AdminStatusBadge } from "@/components/Admin/AdminStatusBadge";

export function AdminPrivacyPreflight() {
  const status = useAdminPrivacyPreflight();

  return (
    <div className="space-y-4 mb-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-purple/20 flex items-center justify-center border border-brand-purple/40">
          <ShieldCheck className="w-5 h-5 text-brand-purple" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Privacy & Consent Preflight</h2>
          <p className="text-xs text-gray-400">Deterministic view of backend tracking health</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {/* Event Pipeline */}
        <div className="glass-panel rounded-2xl p-4 flex flex-col justify-between border border-white/5 transition-colors hover:bg-white/[0.02]">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2 text-gray-300">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-semibold">Event Pipeline</span>
            </div>
            <AdminStatusBadge state={status.eventsPipeline} />
          </div>
          <div>
            <div className="text-xl font-bold text-white">
              {status.lastEventAgeMs < Infinity ? `${Math.round(status.lastEventAgeMs / 1000)}s ago` : "No data"}
            </div>
            <div className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">
              Latest Arrival
            </div>
          </div>
        </div>

        {/* Deduplication */}
        <div className="glass-panel rounded-2xl p-4 flex flex-col justify-between border border-white/5 transition-colors hover:bg-white/[0.02]">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2 text-gray-300">
              <Database className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-semibold">Deduplication</span>
            </div>
            <AdminStatusBadge state={status.dedupeHealth} />
          </div>
          <div>
            <div className="text-sm font-medium text-white truncate">
              {status.dedupeHealth === "live" ? "Enforced via doc ID" : "Canonical key not proven"}
            </div>
            <div className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">
              Event Uniqueness
            </div>
          </div>
        </div>

        {/* Consent Gating */}
        <div className="glass-panel rounded-2xl p-4 flex flex-col justify-between border border-white/5 transition-colors hover:bg-white/[0.02]">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2 text-gray-300">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-semibold">Consent Gating</span>
            </div>
            <AdminStatusBadge state={status.consentGating} />
          </div>
          <div>
            <div className="text-xl font-bold text-white">
              {status.consentRejections} <span className="text-sm text-gray-400 font-normal">denied</span>
            </div>
            <div className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">
              Privacy Enforcement
            </div>
          </div>
        </div>

        {/* Guest Tracking */}
        <div className="glass-panel rounded-2xl p-4 flex flex-col justify-between border border-white/5 transition-colors hover:bg-white/[0.02]">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2 text-gray-300">
              <Clock className="w-4 h-4 text-teal-400" />
              <span className="text-sm font-semibold">Guest Tracking</span>
            </div>
            <AdminStatusBadge state={status.globalGuestTracking} />
          </div>
          <div>
            <div className="text-sm font-medium text-white truncate">
              {status.globalGuestTracking === "live" ? "Session ID adhered" : "Identifier missing"}
            </div>
            <div className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">
              Anonymous Identity
            </div>
          </div>
        </div>

        {/* Cloud Run Ingest */}
        <div className="glass-panel rounded-2xl p-4 flex flex-col justify-between border border-white/5 transition-colors hover:bg-white/[0.02]">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2 text-gray-300">
              <Cloud className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-semibold">Cloud Run Ingest</span>
            </div>
            <AdminStatusBadge state={status.cloudRunIngest} />
          </div>
          <div>
            <div className="text-sm font-medium text-white truncate">
              {status.cloudRunIngest === "live" ? "Canonical origin verified" : "No server origins"}
            </div>
            <div className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">
              Backend Origin
            </div>
          </div>
        </div>

        {/* BigQuery Export */}
        <div className="glass-panel rounded-2xl p-4 flex flex-col justify-between border border-white/5 transition-colors hover:bg-white/[0.02]">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2 text-gray-300">
              <Database className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-semibold">BigQuery Export</span>
            </div>
            <AdminStatusBadge state={status.bqExportHealth} />
          </div>
          <div>
            <div className="text-sm font-medium text-white line-clamp-2 leading-tight">
              {status.bqExportReason}
            </div>
            <div className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">
              Cold Stream Status
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
