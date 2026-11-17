import type { PreferencesStore } from "@/domains/preferences/domain";
import { createVersionedStore, type StorageHost } from "@/shared/infrastructure";
import { settingsShape } from "./stored-settings";

export function storedPreferences(host: StorageHost): PreferencesStore {
  return createVersionedStore(settingsShape, host);
}
