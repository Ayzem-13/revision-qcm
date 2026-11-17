import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";

const ROWS = ["a", "b", "c", "d", "e", "f"] as const;

export function SubjectLoading(): ReactNode {
  return (
    <div className="flex flex-col pt-4">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-10 w-2/3 rounded-xl sm:w-1/3" />
        <Skeleton className="h-4 w-1/2 rounded-md sm:w-1/4" />
      </div>
      <div role="status" className="my-10 flex flex-col items-center gap-4">
        <Spinner />
        <span className="text-base text-muted-foreground">Chargement des questions…</span>
      </div>
      <div aria-hidden="true" className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="flex flex-col gap-3">
          {ROWS.map((row) => (
            <Skeleton key={row} className="h-16 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="hidden h-96 rounded-4xl lg:block" />
      </div>
    </div>
  );
}
