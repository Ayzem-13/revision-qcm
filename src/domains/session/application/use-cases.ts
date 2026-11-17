import type { ChapterId, Subject } from "@/domains/catalog/domain";
import { EMPTY_PROGRESS, overviewOf, record, type Progress, type SubjectOverview } from "@/domains/progress/domain";
import {
  MODE_ORDER,
  begin,
  drawPool,
  handle,
  planSession,
  seededRng,
  viewOf,
  type Mode,
  type Session,
  type SessionCommand,
  type SessionSetup,
  type SessionView,
} from "@/domains/session/domain";
import type { SessionPorts } from "./ports";

export type StudyState = {
  readonly overview: SubjectOverview;
  readonly session: SessionView | null;
};

export type PoolSizes = Readonly<Record<Mode, number>>;

export function stateOf(subject: Subject, session: Session | null, progress: Progress): StudyState {
  return {
    overview: overviewOf(subject, progress),
    session: session === null ? null : viewOf(session, subject),
  };
}

export function poolSizes(ports: SessionPorts, subject: Subject, chapterIds: readonly ChapterId[]): PoolSizes {
  const progress = ports.progress.of(subject);
  const sizes = { training: 0, exam: 0, redo: 0 } satisfies Record<Mode, number>;
  for (const mode of MODE_ORDER) sizes[mode] = drawPool(subject, progress, chapterIds, mode).length;
  return sizes;
}

export function startSession(ports: SessionPorts, subject: Subject, setup: SessionSetup): void {
  const plan = planSession(
    subject,
    ports.progress.of(subject),
    { ...setup, subjectId: subject.id },
    ports.clock.now(),
    seededRng(ports.random.seed()),
  );
  if (plan === null) return;
  ports.sessions.save(begin(plan));
  ports.setups.remember(plan.request);
}

export function replaySession(ports: SessionPorts, subject: Subject): void {
  const current = ports.sessions.of(subject);
  if (current !== null) startSession(ports, subject, current.plan.request);
}

export function quitSession(ports: SessionPorts, subject: Subject): void {
  ports.sessions.discard(subject.id);
}

export function sendCommand(ports: SessionPorts, subject: Subject, command: SessionCommand): void {
  const current = ports.sessions.of(subject);
  if (current === null) return;
  const { session, events } = handle(current, command, ports.clock.now());
  if (session === current) return;
  ports.sessions.save(session);
  const verdicts = events.flatMap((event) => (event.type === "answer-judged" ? [event.verdict] : []));
  if (verdicts.length > 0) ports.progress.update(subject, (progress) => record(progress, verdicts));
}

export function resetProgress(ports: SessionPorts, subject: Subject): void {
  ports.progress.update(subject, () => EMPTY_PROGRESS);
}
