import type { SubjectId, SubjectRepository, SubjectSummary } from "@/domains/catalog/application";
import {
  preferencesSource,
  rememberSetup,
  type PreferencesSource,
  type PreferencesStore,
} from "@/domains/preferences/application";
import type { ProgressRepository } from "@/domains/progress/application";
import { studyOf, type SessionPorts, type SessionRepository, type Study } from "@/domains/session/application";
import type { Clock, Random, Readable } from "@/shared/application";

export type Ports = {
  readonly subjects: SubjectRepository;
  readonly sessions: SessionRepository;
  readonly progress: ProgressRepository;
  readonly preferences: PreferencesStore;
  readonly clock: Clock;
  readonly random: Random;
};

export type Application = {
  readonly subjects: readonly SubjectSummary[];
  study(subjectId: SubjectId): Promise<Study>;
  readonly ongoingSubjectId: Readable<SubjectId | null>;
  readonly preferences: PreferencesSource;
};

export function createApplication(ports: Ports): Application {
  const subjects = ports.subjects.list();
  const studies = new Map<SubjectId, Promise<Study>>();
  const sessionPorts: SessionPorts = {
    sessions: ports.sessions,
    progress: ports.progress,
    setups: { remember: (request) => rememberSetup(ports.preferences, request) },
    clock: ports.clock,
    random: ports.random,
  };

  return {
    subjects,
    study: (subjectId) => {
      const existing = studies.get(subjectId);
      if (existing !== undefined) return existing;
      const opened = ports.subjects.load(subjectId).then((subject) => {
        const ongoing = ports.sessions.ongoing();
        const unrestorable = ongoing?.subjectId === subject.id && ports.sessions.of(subject) === null;
        if (unrestorable) ports.sessions.discard(subject.id);
        return studyOf(sessionPorts, subject);
      });
      studies.set(subjectId, opened);
      opened.catch(() => studies.delete(subjectId));
      return opened;
    },
    ongoingSubjectId: {
      get: () => {
        const ongoing = ports.sessions.ongoing();
        if (ongoing === null || ongoing.finished) return null;
        return subjects.some((summary) => summary.id === ongoing.subjectId) ? ongoing.subjectId : null;
      },
      subscribe: ports.sessions.subscribe,
    },
    preferences: preferencesSource(ports.preferences),
  };
}
