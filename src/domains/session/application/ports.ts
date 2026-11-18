import type { ProgressRepository } from "@/domains/progress/domain";
import type { SessionRepository, SessionRequest } from "@/domains/session/domain";
import type { Clock, Random } from "@/shared/application";

type SetupMemory = { remember(request: SessionRequest): void };

export type SessionPorts = {
  readonly sessions: SessionRepository;
  readonly progress: ProgressRepository;
  readonly setups: SetupMemory;
  readonly clock: Clock;
  readonly random: Random;
};
