export type StorageHost = {
  readonly read: (key: string) => string | null;
  readonly write: (key: string, raw: string) => void;
  readonly watch: (key: string, onChange: () => void) => () => void;
};

function localStore(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export const browserStorage: StorageHost = {
  read: (key) => {
    try {
      return localStore()?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },
  write: (key, raw) => {
    const storage = localStore();
    if (storage === null) throw new Error("storage unavailable");
    storage.setItem(key, raw);
  },
  watch: (key, onChange) => {
    if (typeof window === "undefined") return () => {};
    const listener = (event: StorageEvent): void => {
      if (event.key === key || event.key === null) onChange();
    };
    window.addEventListener("storage", listener);
    return () => window.removeEventListener("storage", listener);
  },
};
