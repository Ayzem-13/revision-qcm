import type { Preferences, PreferencesStore, ThemePreference } from "@/domains/preferences/domain";
import type { SessionSetup } from "@/domains/session/domain";
import type { Readable } from "@/shared/application";

export type PreferencesSource = Readable<Preferences> & { chooseTheme(theme: ThemePreference): void };

export function preferencesSource(store: PreferencesStore): PreferencesSource {
  return {
    get: store.get,
    subscribe: store.subscribe,
    chooseTheme: (theme) => store.update((current) => ({ ...current, theme })),
  };
}

export function rememberSetup(store: PreferencesStore, setup: Pick<SessionSetup, "count" | "mode">): void {
  store.update((current) => ({ ...current, lastCount: setup.count, lastMode: setup.mode }));
}
