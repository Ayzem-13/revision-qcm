import { useMemo, useSyncExternalStore } from "react";
import type { SubjectSummary } from "@/domains/catalog/application";

export type Route = { readonly name: "home" } | { readonly name: "subject"; readonly subject: SubjectSummary };

function subscribe(listener: () => void): () => void {
  window.addEventListener("hashchange", listener);
  return () => window.removeEventListener("hashchange", listener);
}

function readHash(): string {
  return window.location.hash;
}

function routeOf(hash: string, subjects: readonly SubjectSummary[]): Route {
  const id = decodeURIComponent(hash.replace(/^#\/?/, ""));
  if (id === "") return { name: "home" };
  const subject = subjects.find((candidate) => candidate.id === id);
  return subject === undefined ? { name: "home" } : { name: "subject", subject };
}

export function useRoute(subjects: readonly SubjectSummary[]): Route {
  const hash = useSyncExternalStore(subscribe, readHash, () => "");
  return useMemo(() => routeOf(hash, subjects), [hash, subjects]);
}

export function hrefOf(route: Route): string {
  return route.name === "home" ? "#/" : `#/${encodeURIComponent(route.subject.id)}`;
}
