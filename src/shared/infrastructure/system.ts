import type { Clock, Random } from "@/shared/application";

export const systemClock: Clock = { now: () => Date.now() };

export const cryptoRandom: Random = {
  seed: () => crypto.getRandomValues(new Uint32Array(1))[0] ?? 0,
};
