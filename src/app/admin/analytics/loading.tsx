import { getMobileSkeletonClass } from "@/lib/ui/loading-state-contract";

const adminAnalyticsCardSkeletonClassName = getMobileSkeletonClass("admin", "evidence");
const adminAnalyticsHeaderSkeletonClassName = getMobileSkeletonClass("admin", "overview", "h-9 max-w-xs");

export default function AdminAnalyticsLoading() {
  return (
    <section
      className="bg-[#020617] px-3 py-4 text-white sm:px-6 sm:py-6 lg:px-8"
      data-mobile-density="compact"
      data-mobile-sprawl-guard="true"
      data-mobile-skeleton="admin-analytics-loading"
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3">
        <div className={adminAnalyticsHeaderSkeletonClassName} aria-hidden="true" />
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4" aria-label="Loading admin analytics snapshot cards">
          {["live", "mobile", "revenue", "purchases"].map((key) => (
            <div key={key} className={adminAnalyticsCardSkeletonClassName} data-mobile-skeleton={`admin-analytics-card-${key}`}>
              <div className="h-3 w-24 rounded bg-white/10" aria-hidden="true" />
              <div className="mt-3 h-6 w-28 rounded bg-white/15" aria-hidden="true" />
              <div className="mt-2 h-3 w-36 rounded bg-white/10" aria-hidden="true" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
