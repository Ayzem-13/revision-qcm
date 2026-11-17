import { useSyncExternalStore } from "react";
import type { PreferencesSource, ThemePreference } from "@/domains/preferences/application";
import { useReadable } from "@/shared/components";

const DARK_QUERY = "(prefers-color-scheme: dark)";

function systemPrefersDark(): boolean {
  return window.matchMedia(DARK_QUERY).matches;
}

function resolve(preference: ThemePreference, systemDark: boolean): "light" | "dark" {
  if (preference === "system") return systemDark ? "dark" : "light";
  return preference;
}

export function installTheme(preferences: PreferencesSource): void {
  const apply = (): void => {
    const scheme = resolve(preferences.get().theme, systemPrefersDark());
    document.documentElement.classList.toggle("dark", scheme === "dark");
  };
  apply();
  preferences.subscribe(apply);
  window.matchMedia(DARK_QUERY).addEventListener("change", apply);
}

function subscribeToSystem(listener: () => void): () => void {
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}

export function useThemePreference(preferences: PreferencesSource): {
  readonly preference: ThemePreference;
  readonly resolved: "light" | "dark";
  readonly choose: (preference: ThemePreference) => void;
} {
  const { theme } = useReadable(preferences);
  const systemDark = useSyncExternalStore(subscribeToSystem, systemPrefersDark, () => false);
  return { preference: theme, resolved: resolve(theme, systemDark), choose: preferences.chooseTheme };
}
