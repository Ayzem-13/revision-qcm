import { useSyncExternalStore } from "react";
import type { Readable } from "@/shared/application";

export function useReadable<T>(source: Readable<T>): T {
  return useSyncExternalStore(source.subscribe, source.get, source.get);
}
