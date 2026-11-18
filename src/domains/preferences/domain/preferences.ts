import type { ChapterId, SubjectId } from "@/domains/catalog/domain";
import type { Mode } from "@/domains/session/domain";

export type ThemePreference = "system" | "light" | "dark";

export type Preferences = {
  readonly theme: ThemePreference;
  readonly lastCount: number;
  readonly lastMode: Mode;
  readonly lastChapters: Readonly<Partial<Record<SubjectId, readonly ChapterId[]>>>;
};

export type PreferencesStore = {
  get(): Preferences;
  update(change: (current: Preferences) => Preferences): void;
  subscribe(listener: () => void): () => void;
};
