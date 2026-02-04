export default function DashboardLoading() {
  return (
    <div className="flex h-screen bg-stone-50">
      {/* Sidebar Skeleton */}
      <div className="hidden lg:block w-64 bg-stone-900 animate-pulse" />

      {/* Main Content Skeleton */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header Skeleton */}
        <div className="h-16 bg-white border-b border-stone-200 flex items-center px-6">
          <div className="h-6 w-32 bg-stone-200 rounded animate-pulse" />
        </div>

        {/* Body Skeleton */}
        <div className="flex-1 overflow-auto p-4 md:p-8 space-y-6">
          <div className="h-8 w-48 bg-stone-200 rounded animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-64 bg-white rounded-xl border border-stone-100 animate-pulse" />
            <div className="h-64 bg-white rounded-xl border border-stone-100 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
