export default function AdminLoading() {
  return (
    <div className="flex min-h-[calc(100dvh-8rem)] w-full flex-1 flex-col gap-4 overflow-hidden rounded-[1.6rem] border border-white/10 bg-black/20 p-4 md:min-h-[calc(100dvh-10rem)] md:gap-5 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="h-3 w-24 rounded-full bg-white/8" />
          <div className="h-8 w-56 rounded-full bg-white/10" />
          <div className="h-3 w-72 max-w-full rounded-full bg-white/6" />
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
          <div className="h-5 w-5 rounded-full border-[3px] border-white/10 border-t-brand-purple animate-spin" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-3">
            <div className="h-3 w-20 rounded-full bg-white/8" />
            <div className="mt-3 h-7 w-16 rounded-full bg-white/10" />
            <div className="mt-3 h-3 w-28 rounded-full bg-white/6" />
          </div>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="min-h-0 rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-3">
          <div className="h-3 w-28 rounded-full bg-white/8" />
          <div className="mt-3 space-y-2">
            {Array.from({ length: 7 }).map((_, index) => (
              <div key={index} className="h-11 rounded-xl bg-white/[0.04]" />
            ))}
          </div>
        </div>

        <div className="min-h-0 rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-3">
          <div className="h-3 w-24 rounded-full bg-white/8" />
          <div className="mt-3 space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="rounded-xl border border-white/8 bg-black/20 p-3">
                <div className="h-3 w-24 rounded-full bg-white/8" />
                <div className="mt-2 h-3 w-full rounded-full bg-white/6" />
                <div className="mt-2 h-3 w-5/6 rounded-full bg-white/6" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
