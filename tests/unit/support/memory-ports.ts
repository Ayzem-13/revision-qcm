import type { Ports } from "@/app/application";
import { InvalidSubject, type Subject, type SubjectRepository } from "@/domains/catalog/domain";
import { storedPreferences } from "@/domains/preferences/infrastructure";
import { storedProgressRepository } from "@/domains/progress/infrastructure";
import { storedSessionRepository } from "@/domains/session/infrastructure";
import type { Clock, Random } from "@/shared/application";
import type { StorageHost } from "@/shared/infrastructure";

export class MemoryHost implements StorageHost {
  readonly items = new Map<string, string>();
  readonly watchers = new Set<{ key: string; onChange: () => void }>();
  failWrites = false;

  read = (key: string): string | null => this.items.get(key) ?? null;

  write = (key: string, raw: string): void => {
    if (this.failWrites) throw new Error("quota dépassé");
    this.items.set(key, raw);
  };

  watch = (key: string, onChange: () => void): (() => void) => {
    const watcher = { key, onChange };
    this.watchers.add(watcher);
    return () => this.watchers.delete(watcher);
  };

  fromAnotherTab(key: string, raw: string): void {
    this.items.set(key, raw);
    for (const watcher of this.watchers) if (watcher.key === key) watcher.onChange();
  }
}

type SettableClock = Clock & { set(now: number): void };

function settableClock(start: number): SettableClock {
  let current = start;
  return {
    now: () => current,
    set: (now) => {
      current = now;
    },
  };
}

function countingRandom(start: number): Random {
  let next = start;
  return { seed: () => next++ };
}

function memorySubjects(subjects: readonly Subject[]): SubjectRepository & { readonly loads: () => number } {
  let loads = 0;
  return {
    list: () =>
      subjects.map((subject) => ({
        id: subject.id,
        title: subject.title,
        hue: subject.hue,
        chapterCount: subject.chapters.size,
      })),
    load: (id) => {
      loads += 1;
      const subject = subjects.find((candidate) => candidate.id === id);
      return subject === undefined
        ? Promise.reject(new InvalidSubject([{ file: `content/${id}`, message: "matière introuvable" }]))
        : Promise.resolve(subject);
    },
    loads: () => loads,
  };
}

export type MemoryPorts = Ports & {
  readonly host: MemoryHost;
  readonly clock: SettableClock;
  readonly subjects: ReturnType<typeof memorySubjects>;
};

export function memoryPorts(options: {
  readonly subjects: readonly Subject[];
  readonly now?: number;
  readonly seed?: number;
  readonly host?: MemoryHost;
}): MemoryPorts {
  const host = options.host ?? new MemoryHost();
  return {
    host,
    subjects: memorySubjects(options.subjects),
    sessions: storedSessionRepository(host),
    progress: storedProgressRepository(host),
    preferences: storedPreferences(host),
    clock: settableClock(options.now ?? 1000),
    random: countingRandom(options.seed ?? 42),
  };
}
