import type { Preferences, PreferencesStore, ThemePreference } from "@/domains/preferences/domain";
import type { SessionRequest } from "@/domains/session/domain";
import type { Readable } from "@/shared/application";

export type PreferencesSource = Readable<Preferences> & { chooseTheme(theme: ThemePreference): void };

export function preferencesSource(store: PreferencesStore): PreferencesSource {
  return {
    get: store.get,
    subscribe: store.subscribe,
    chooseTheme: (theme) => store.update((current) => ({ ...current, theme })),
  };
}

export function rememberSetup(store: PreferencesStore, request: SessionRequest): void {
  store.update((current) => ({
    ...current,
    lastCount: request.count,
    lastMode: request.mode,
    lastChapters: { ...current.lastChapters, [request.subjectId]: request.chapterIds },
  }));
}
