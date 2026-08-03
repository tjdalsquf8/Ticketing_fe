export default function RankingLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">

      {/* 헤더 */}
      <div className="space-y-2">
        <div className="h-7 w-16 bg-bg-subtle rounded animate-pulse" />
        <div className="h-4 w-40 bg-bg-subtle rounded animate-pulse" />
      </div>

      {/* 탭 */}
      <div className="flex gap-3">
        <div className="h-9 w-52 bg-bg-subtle rounded-lg animate-pulse" />
        <div className="h-9 w-44 bg-bg-subtle rounded-lg animate-pulse" />
      </div>

      {/* 이벤트 필터 */}
      <div className="flex gap-2">
        {[60, 160, 140, 120].map((w, i) => (
          <div key={i} className="h-8 bg-bg-subtle rounded-lg animate-pulse" style={{ width: w }} />
        ))}
      </div>

      {/* 테이블 */}
      <div className="card overflow-hidden">
        <div className="border-b border-border bg-bg-subtle px-4 py-3 flex gap-8">
          <div className="h-3 w-8 bg-bg-muted rounded animate-pulse" />
          <div className="h-3 w-16 bg-bg-muted rounded animate-pulse" />
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-4 py-3 flex items-center gap-4">
              <div className="h-4 w-6 bg-bg-subtle rounded animate-pulse" />
              <div className="h-4 w-24 bg-bg-subtle rounded animate-pulse flex-1" />
              <div className="h-4 w-16 bg-bg-subtle rounded animate-pulse ml-auto" />
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
