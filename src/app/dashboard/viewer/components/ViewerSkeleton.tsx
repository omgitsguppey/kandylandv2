import Skeleton, { SkeletonTheme } from "react-loading-skeleton";

export function ViewerSkeleton() {
    return (
        <SkeletonTheme baseColor="#1a1a1a" highlightColor="#2a2a2a">
            <div className="max-w-4xl mx-auto pt-20">
                <div className="flex justify-between mb-6">
                    <Skeleton width={100} height={16} />
                    <Skeleton width={128} height={24} borderRadius={9999} />
                </div>
                <div className="mb-8">
                    <Skeleton height={400} borderRadius={24} />
                </div>
                <Skeleton height={32} width="50%" className="mb-4" />
                <Skeleton count={2} height={16} className="mb-2" />
            </div>
        </SkeletonTheme>
    );
}
