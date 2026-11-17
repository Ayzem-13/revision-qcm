import { z } from "zod";
import type { StorageHost } from "./browser-storage";

const envelope = z.object({ v: z.number().int().positive(), data: z.unknown() });

export type StoreDefinition<T> = {
  readonly key: string;
  readonly version: number;
  readonly migrations: Readonly<Record<number, (older: unknown) => unknown>>;
  readonly decode: (data: unknown) => T;
  readonly encode: (value: T) => unknown;
  readonly fallback: T;
};

export type VersionedStore<T> = {
  get(): T;
  update(change: (current: T) => T): void;
  subscribe(listener: () => void): () => void;
};

class NewerVersionError extends Error {}

function migrate<T>(definition: StoreDefinition<T>, raw: string): T {
  const { v, data } = envelope.parse(JSON.parse(raw));
  if (v > definition.version) throw new NewerVersionError(`version ${v}`);
  let current = data;
  for (let version = v; version < definition.version; version += 1) {
    const step = definition.migrations[version];
    if (step === undefined) throw new Error(`missing migration from version ${version}`);
    current = step(current);
  }
  return definition.decode(current);
}

export function createVersionedStore<T>(definition: StoreDefinition<T>, host: StorageHost): VersionedStore<T> {
  const corruptKey = `${definition.key}.corrupt`;
  const listeners = new Set<() => void>();
  let cache: { readonly raw: string | null; readonly value: T } | null = null;
  let readOnly = false;

  const setAside = (raw: string): void => {
    if (host.read(corruptKey) !== null) return;
    try {
      host.write(corruptKey, raw);
    } catch {
      return;
    }
  };

  const decodeRaw = (raw: string | null): T => {
    if (raw === null) return definition.fallback;
    try {
      return migrate(definition, raw);
    } catch (error) {
      if (error instanceof NewerVersionError) readOnly = true;
      else setAside(raw);
      return definition.fallback;
    }
  };

  const get = (): T => {
    const raw = host.read(definition.key);
    if (cache !== null && cache.raw === raw) return cache.value;
    const value = decodeRaw(raw);
    cache = { raw, value };
    return value;
  };

  const notify = (): void => {
    for (const listener of listeners) listener();
  };

  const update = (change: (current: T) => T): void => {
    const next = change(get());
    const before = host.read(definition.key);
    let raw = before;
    if (!readOnly) {
      const written = JSON.stringify({ v: definition.version, data: definition.encode(next) });
      try {
        host.write(definition.key, written);
        raw = written;
      } catch {
        raw = before;
      }
    }
    cache = { raw, value: next };
    notify();
  };

  const subscribe = (listener: () => void): (() => void) => {
    listeners.add(listener);
    const unwatch = host.watch(definition.key, listener);
    return () => {
      listeners.delete(listener);
      unwatch();
    };
  };

  return { get, update, subscribe };
}
