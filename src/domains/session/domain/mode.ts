export type ModePolicy = {
  readonly feedback: "immediate" | "deferred";
  readonly pool: "all" | "mistakes";
  readonly navigation: "linear" | "free";
  readonly secondsPerQuestion: number | null;
};

export const MODES = {
  training: { feedback: "immediate", pool: "all", navigation: "linear", secondsPerQuestion: null },
  exam: { feedback: "deferred", pool: "all", navigation: "free", secondsPerQuestion: 60 },
  redo: { feedback: "immediate", pool: "mistakes", navigation: "linear", secondsPerQuestion: null },
} as const satisfies Record<string, ModePolicy>;

export type Mode = keyof typeof MODES;

export function isMode(value: unknown): value is Mode {
  return typeof value === "string" && Object.hasOwn(MODES, value);
}

export const MODE_ORDER: readonly Mode[] = Object.keys(MODES).filter(isMode);
