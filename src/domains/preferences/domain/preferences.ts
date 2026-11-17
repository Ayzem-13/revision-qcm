import type { Mode } from "@/domains/session/domain";

export type ThemePreference = "system" | "light" | "dark";

export type Preferences = {
  readonly theme: ThemePreference;
  readonly lastCount: number;
  readonly lastMode: Mode;
};

export type PreferencesStore = {
  get(): Preferences;
  update(change: (current: Preferences) => Preferences): void;
  subscribe(listener: () => void): () => void;
};
