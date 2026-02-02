export default function LibrarySkeleton() {
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4 flex flex-col md:flex-row md:items-center gap-4 animate-pulse">
      {/* Left Icon */}
      <div className="w-12 h-12 md:w-14 md:h-14 bg-stone-200 rounded-2xl shrink-0" />
      
      {/* Center Content */}
      <div className="flex-1 space-y-3 py-1">
        <div className="flex items-center gap-2">
            <div className="w-24 h-3 bg-stone-200 rounded-full" />
            <div className="w-2 h-2 bg-stone-200 rounded-full" />
            <div className="w-16 h-3 bg-stone-200 rounded-full" />
        </div>
        <div className="w-48 h-6 bg-stone-200 rounded-md" />
        <div className="flex gap-2">
            <div className="w-24 h-5 bg-stone-200 rounded-md" />
            <div className="w-20 h-5 bg-stone-200 rounded-md" />
        </div>
      </div>

      {/* Right Action */}
      <div className="hidden md:block">
        <div className="w-32 h-10 bg-stone-200 rounded-lg" />
      </div>
    </div>
  );
}
