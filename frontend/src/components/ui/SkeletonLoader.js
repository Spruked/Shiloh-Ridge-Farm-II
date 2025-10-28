import React from "react";

const SkeletonLoader = ({ count = 4 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-xl p-6 flex flex-col gap-4">
        <div className="h-40 w-full bg-gray-300 dark:bg-gray-600 rounded-lg" />
        <div className="h-6 w-2/3 bg-gray-300 dark:bg-gray-600 rounded" />
        <div className="h-4 w-1/2 bg-gray-300 dark:bg-gray-600 rounded" />
        <div className="h-4 w-1/3 bg-gray-300 dark:bg-gray-600 rounded" />
      </div>
    ))}
  </div>
);

export default SkeletonLoader;
