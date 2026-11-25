import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div>
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-3 h-8 w-80" />
      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="rounded-lg bg-surface p-4 shadow-card"><Skeleton className="h-3 w-20" /><Skeleton className="mt-4 h-7 w-32" /><Skeleton className="mt-2 h-3 w-24" /></div>)}
        <div className="rounded-lg bg-surface p-4 shadow-card md:col-span-2 xl:col-span-3"><Skeleton className="h-3 w-24" /><Skeleton className="mt-4 h-56 w-full" /></div>
        <div className="rounded-lg bg-surface p-4 shadow-card md:col-span-2 xl:col-span-1"><Skeleton className="h-3 w-24" /><Skeleton className="mt-4 h-56 w-full" /></div>
      </div>
    </div>
  );
}
