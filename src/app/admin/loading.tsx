function SkeletonLine({ className }: { className: string }) {
  return <div className={`rounded-full bg-white/8 ${className}`} />;
}

function SkeletonModule({
  headerWidth,
  rows,
}: {
  headerWidth: string;
  rows: number;
}) {
  return (
    <div className="rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-3 md:p-4">
      <SkeletonLine className={`h-3 ${headerWidth}`} />
      <div className="mt-3 space-y-2.5">
        {Array.from({ length: rows }).map((_, index) => (
          <div
            key={index}
            className="rounded-xl border border-white/7 bg-black/20 p-3"
          >
            <SkeletonLine className="h-3 w-24" />
            <SkeletonLine className="mt-2 h-3 w-full bg-white/6" />
            <SkeletonLine className="mt-2 h-3 w-5/6 bg-white/6" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminLoading() {
  return (
    <div className="min-h-[calc(100dvh-10rem)] w-full space-y-3 md:min-h-[calc(100dvh-11rem)] md:space-y-4">
      <div className="rounded-[1.6rem] border border-white/10 bg-black/20 p-4 md:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <SkeletonLine className="h-3 w-24" />
            <SkeletonLine className="h-8 w-56 max-w-full bg-white/10" />
            <SkeletonLine className="h-3 w-72 max-w-full bg-white/6" />
          </div>
          <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2">
            <SkeletonLine className="h-3 w-24" />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="rounded-[1.15rem] border border-white/8 bg-white/[0.03] p-3"
            >
              <SkeletonLine className="h-3 w-20" />
              <SkeletonLine className="mt-3 h-7 w-16 bg-white/10" />
              <SkeletonLine className="mt-3 h-3 w-28 bg-white/6" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-12">
        <div className="xl:col-span-12">
          <div className="rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-3 md:p-4">
            <SkeletonLine className="h-3 w-32" />
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-white/7 bg-black/20 p-3"
                >
                  <SkeletonLine className="h-3 w-20" />
                  <SkeletonLine className="mt-2 h-6 w-16 bg-white/10" />
                  <SkeletonLine className="mt-2 h-3 w-24 bg-white/6" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="xl:col-span-7">
          <SkeletonModule headerWidth="w-36" rows={5} />
        </div>

        <div className="xl:col-span-5">
          <SkeletonModule headerWidth="w-32" rows={4} />
        </div>

        <div className="xl:col-span-12">
          <div className="rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-3 md:p-4">
            <SkeletonLine className="h-3 w-28" />
            <div className="mt-3 grid gap-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] gap-3 rounded-xl border border-white/7 bg-black/20 p-3"
                >
                  <div className="space-y-2">
                    <SkeletonLine className="h-3 w-28" />
                    <SkeletonLine className="h-3 w-full bg-white/6" />
                  </div>
                  <div className="space-y-2">
                    <SkeletonLine className="h-3 w-20" />
                    <SkeletonLine className="h-3 w-24 bg-white/6" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
