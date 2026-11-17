import type { ChapterId, ChoiceId, Subject } from "@/domains/catalog/domain";
import type { Progress } from "@/domains/progress/domain";
import type { Session, SessionSetup } from "@/domains/session/domain";
import type { Readable } from "@/shared/application";
import type { SessionPorts } from "./ports";
import {
  poolSizes,
  quitSession,
  replaySession,
  resetProgress,
  sendCommand,
  startSession,
  stateOf,
  type PoolSizes,
  type StudyState,
} from "./use-cases";

export type Study = Readable<StudyState> & {
  poolSizes(chapterIds: readonly ChapterId[]): PoolSizes;
  start(setup: SessionSetup): void;
  replay(): void;
  quit(): void;
  toggle(choiceId: ChoiceId): void;
  confirm(): void;
  goTo(index: number): void;
  expire(): void;
  resetProgress(): void;
};

type Derived = { readonly session: Session | null; readonly progress: Progress; readonly state: StudyState };

export function studyOf(ports: SessionPorts, subject: Subject): Study {
  let derived: Derived | null = null;
  return {
    get: () => {
      const session = ports.sessions.of(subject);
      const progress = ports.progress.of(subject);
      if (derived === null || derived.session !== session || derived.progress !== progress) {
        derived = { session, progress, state: stateOf(subject, session, progress) };
      }
      return derived.state;
    },
    subscribe: (listener) => {
      const offSessions = ports.sessions.subscribe(listener);
      const offProgress = ports.progress.subscribe(subject.id, listener);
      return () => {
        offSessions();
        offProgress();
      };
    },
    poolSizes: (chapterIds) => poolSizes(ports, subject, chapterIds),
    start: (setup) => startSession(ports, subject, setup),
    replay: () => replaySession(ports, subject),
    quit: () => quitSession(ports, subject),
    toggle: (choiceId) => sendCommand(ports, subject, { type: "toggle", choiceId }),
    confirm: () => sendCommand(ports, subject, { type: "confirm" }),
    goTo: (index) => sendCommand(ports, subject, { type: "goTo", index }),
    expire: () => sendCommand(ports, subject, { type: "expire" }),
    resetProgress: () => resetProgress(ports, subject),
  };
}
