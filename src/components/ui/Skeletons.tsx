export function ProviderCardSkeleton() {
  return (
    <div className="premium-card flex flex-col gap-4 p-5 animate-pulse">
      <div className="flex justify-between items-start">
        <div className="flex gap-3 items-center">
          <div className="w-12 h-12 rounded-full bg-[rgba(20,33,61,0.1)]"></div>
          <div className="flex flex-col gap-2">
            <div className="h-5 w-32 bg-[rgba(20,33,61,0.1)] rounded-md"></div>
            <div className="h-4 w-48 bg-[rgba(20,33,61,0.08)] rounded-md"></div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="h-6 w-16 bg-[rgba(249,115,22,0.16)] rounded-full"></div>
          <div className="h-4 w-10 bg-[rgba(20,33,61,0.08)] rounded-md"></div>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-2">
        <div className="flex-1 h-10 bg-[rgba(20,33,61,0.08)] rounded-md"></div>
        <div className="flex-1 h-10 bg-[rgba(20,33,61,0.08)] rounded-md"></div>
      </div>

      <div className="w-full h-8 bg-[rgba(249,115,22,0.16)] rounded-md mt-2"></div>
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
