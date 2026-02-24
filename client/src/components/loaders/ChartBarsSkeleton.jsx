import React from "react";
import Skeleton from "./Skeleton";

function ChartBarsSkeleton({ className = "" }) {
  return (
    <div className={`w-full h-full flex items-end gap-2 ${className}`}>
      {[34, 58, 42, 76, 64, 48].map((height, index) => (
        <div key={index} className="flex-1 min-w-0">
          <Skeleton
            variant="chart"
            height={`${height}%`}
            rounded="rounded-md"
            className="min-h-[26px]"
          />
        </div>
      ))}
    </div>
  );
}

export default ChartBarsSkeleton;
