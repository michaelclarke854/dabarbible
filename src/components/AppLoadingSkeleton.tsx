import { Skeleton } from "@/components/ui/skeleton";

const AppLoadingSkeleton = () => (
  <div className="min-h-screen flex flex-col">
    <main className="flex-1 pb-20">
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-6">
        <Skeleton className="h-10 w-32 mb-4 bg-gold/10" />
        <Skeleton className="h-4 w-20 mb-8 bg-gold/5" />
        <Skeleton className="h-12 w-full max-w-md bg-muted/30 rounded-sm" />
        <Skeleton className="h-4 w-48 mt-6 bg-muted/20" />
      </div>
    </main>
    <nav className="fixed bottom-0 left-0 right-0 bg-nav/95 border-t border-gold/15 z-30">
      <div className="flex max-w-lg mx-auto">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex-1 py-3 flex flex-col items-center gap-1">
            <Skeleton className="h-4 w-4 bg-muted/20 rounded-full" />
            <Skeleton className="h-2 w-8 bg-muted/10" />
          </div>
        ))}
      </div>
    </nav>
  </div>
);

export default AppLoadingSkeleton;
