import Skeleton, { SkeletonTheme } from "react-loading-skeleton";

export function ViewerSkeleton() {
  return (
    <SkeletonTheme baseColor="#17112a" highlightColor="#2a1d42">
      <main className="min-h-dvh bg-slate-950 px-3 py-4 sm:px-5 sm:py-6">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mb-4 flex min-h-11 items-center justify-between rounded-2xl border border-white/10 bg-slate-950/80 px-4">
            <Skeleton width={116} height={18} />
            <Skeleton width={132} height={18} />
          </div>
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-black p-3 shadow-2xl shadow-black/30 sm:p-4">
            <Skeleton height={480} borderRadius={20} />
            <div className="mt-4 flex gap-3 overflow-hidden">
              {[1, 2, 3, 4].map((item) => <Skeleton key={item} width={80} height={80} borderRadius={16} />)}
            </div>
          </div>
          <div className="mt-6 rounded-3xl border border-white/10 bg-slate-950/80 p-6">
            <Skeleton width={110} height={16} />
            <Skeleton className="mt-4" width="60%" height={36} />
            <Skeleton className="mt-4" count={2} height={16} />
          </div>
        </div>
      </main>
    </SkeletonTheme>
  );
}
