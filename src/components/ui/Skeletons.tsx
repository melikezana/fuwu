export function ProviderCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4 animate-pulse">
      <div className="flex justify-between items-start">
        <div className="flex gap-3 items-center">
          <div className="w-12 h-12 rounded-full bg-gray-200"></div>
          <div className="flex flex-col gap-2">
            <div className="h-5 w-32 bg-gray-200 rounded"></div>
            <div className="h-4 w-48 bg-gray-200 rounded"></div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
          <div className="h-4 w-10 bg-gray-200 rounded"></div>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-2">
        <div className="flex-1 h-10 bg-gray-200 rounded-xl"></div>
        <div className="flex-1 h-10 bg-gray-200 rounded-xl"></div>
      </div>

      <div className="w-full h-8 bg-gray-200 rounded mt-2"></div>
    </div>
  );
}

export function SkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProviderCardSkeleton key={i} />
      ))}
    </div>
  );
}
