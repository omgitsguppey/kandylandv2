import { AdminPrivacyPreflight } from "../AdminPrivacyPreflight";
import { AdminPageHeader } from "@/components/Admin/AdminPageHeader";
import { PageViewEvent } from "@/components/Analytics/PageViewEvent";

export default function AdminPrivacyPage() {
  return (
    <div className="space-y-4 md:space-y-5">
      <PageViewEvent eventName="admin_privacy_viewed" />
      <AdminPageHeader
        eyebrow="Admin Setup"
        title="Privacy Console"
        subtitle="Privacy, consent, guest identity, and export evidence with source-aware truth states."
        compact
      />
      <div className="w-full">
        <AdminPrivacyPreflight />
      </div>
    </div>
  );
}
