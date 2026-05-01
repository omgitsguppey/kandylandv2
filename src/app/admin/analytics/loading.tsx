export default function AdminAnalyticsLoading() {
  return (
    <section className="min-h-screen bg-[#020617] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <div className="h-10 w-64 rounded-md bg-white/10" aria-hidden="true" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Loading admin analytics snapshot cards">
          {["live", "mobile", "revenue", "purchases"].map((key) => (
            <div key={key} className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
              <div className="h-3 w-24 rounded bg-white/10" aria-hidden="true" />
              <div className="mt-4 h-8 w-32 rounded bg-white/15" aria-hidden="true" />
              <div className="mt-3 h-3 w-40 rounded bg-white/10" aria-hidden="true" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
