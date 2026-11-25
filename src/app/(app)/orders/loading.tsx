import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div>
      <Skeleton className="h-6 w-40" />
      <Skeleton className="mt-2 h-4 w-72" />
      <div className="mt-8 rounded-lg bg-surface p-4 shadow-card">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="mb-3 h-9 w-full last:mb-0" />)}
      </div>
    </div>
  );
}
