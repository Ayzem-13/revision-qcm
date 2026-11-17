import { z } from "zod";
import type { Preferences } from "@/domains/preferences/domain";
import { isMode, type Mode } from "@/domains/session/domain";
import type { StoreDefinition } from "@/shared/infrastructure";

const mode = z.custom<Mode>(isMode);

const storedSettings = z.object({
  theme: z.enum(["system", "light", "dark"]),
  lastCount: z.number().int().positive(),
  lastMode: mode,
});

export const settingsShape: StoreDefinition<Preferences> = {
  key: "qcm.settings",
  version: 1,
  migrations: {},
  decode: (data) => storedSettings.parse(data),
  encode: (value) => value,
  fallback: { theme: "system", lastCount: 20, lastMode: "training" },
};
