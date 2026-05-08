import Link from "next/link";
import { ArrowRight, Megaphone } from "lucide-react";

import { PageViewEvent } from "@/components/Analytics/PageViewEvent";

export default function LegacyCreatorSettingsPage() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg items-center px-4 py-8">
      <PageViewEvent
        eventName="creator_settings_migrated_redirect_viewed"
        eventParams={{
          actor_role: "creator",
          creator_id: "",
          target_creator_id: "",
          section: "migration_notice",
          source_component: "LegacyCreatorSettingsPage",
          truth_state: "migrated",
        }}
      />
      <div className="rounded-3xl border border-white/10 bg-black/60 p-5 text-white">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-brand-purple/20 bg-brand-purple/10 p-3 text-brand-purple">
            <Megaphone className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Moved</p>
            <h1 className="text-2xl font-black">Creator settings now live in Creator Dashboard.</h1>
          </div>
        </div>
        <p className="mt-3 text-sm text-gray-300">Broadcasts, Fan Pass, bookings, requests, and payout tools have moved to the creator operations hub.</p>
        <Link href="/dashboard/creator" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-purple px-4 py-2 text-sm font-bold text-white">
          Open Creator Dashboard
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
