import React from "react";
import Skeleton from "./Skeleton";

function RouteFallbackSkeleton() {
  return (
    <div className="min-h-screen px-6 py-12 bg-[#f3f3f3] dark:bg-slate-950">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="space-y-3">
          <Skeleton width="36%" height={28} rounded="rounded-xl" />
          <Skeleton width="62%" height={14} rounded="rounded-lg" />
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[0, 1, 2].map((key) => (
            <div
              key={key}
              className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-5 space-y-4"
            >
              <Skeleton variant="card" height={130} rounded="rounded-xl" />
              <Skeleton variant="text" width="65%" />
              <Skeleton variant="text" width="90%" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default RouteFallbackSkeleton;
