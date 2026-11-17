import type { ChoiceId } from "@/domains/catalog/domain";
import type { Verdict } from "@/domains/progress/domain";
import { MODES, type ModePolicy } from "./mode";
import type { SessionItem, SessionPlan } from "./plan";
import { isCorrect } from "./scoring";

export type Selection = ReadonlySet<ChoiceId>;

export type Ending = "completed" | "timeout";

type Stage =
  | { readonly kind: "answering" }
  | { readonly kind: "revealed" }
  | { readonly kind: "finished"; readonly endedAt: number; readonly ending: Ending };

export type Session = {
  readonly plan: SessionPlan;
  readonly selections: readonly Selection[];
  readonly cursor: number;
  readonly stage: Stage;
};

export type FinishedSession = Session & { readonly stage: Extract<Stage, { readonly kind: "finished" }> };

export type SessionCommand =
  | { readonly type: "toggle"; readonly choiceId: ChoiceId }
  | { readonly type: "confirm" }
  | { readonly type: "goTo"; readonly index: number }
  | { readonly type: "expire" };

type SessionEvent =
  | { readonly type: "answer-judged"; readonly verdict: Verdict }
  | { readonly type: "session-finished"; readonly ending: Ending; readonly at: number };

export type Outcome = { readonly session: Session; readonly events: readonly SessionEvent[] };

export type PrimaryAction = { readonly kind: "reveal" | "next" | "finish"; readonly enabled: boolean };

const EMPTY_SELECTION: Selection = new Set();

export function policyOf(session: Session): ModePolicy {
  return MODES[session.plan.request.mode];
}

export function currentItem(session: Session): SessionItem {
  return session.plan.items[session.cursor] ?? session.plan.items[0];
}

export function selectionAt(session: Session, index: number): Selection {
  return session.selections[index] ?? EMPTY_SELECTION;
}

export function isFinished(session: Session): session is FinishedSession {
  return session.stage.kind === "finished";
}

function isLast(session: Session): boolean {
  return session.cursor >= session.plan.items.length - 1;
}

export function begin(plan: SessionPlan): Session {
  return {
    plan,
    selections: plan.items.map(() => EMPTY_SELECTION),
    cursor: 0,
    stage: { kind: "answering" },
  };
}

export function primaryAction(session: Session): PrimaryAction | null {
  if (session.stage.kind === "finished") return null;
  const move: PrimaryAction = { kind: isLast(session) ? "finish" : "next", enabled: true };
  if (policyOf(session).feedback === "deferred" || session.stage.kind === "revealed") return move;
  return { kind: "reveal", enabled: selectionAt(session, session.cursor).size > 0 };
}

function judged(session: Session, index: number, at: number): SessionEvent[] {
  const item = session.plan.items[index];
  const selection = selectionAt(session, index);
  if (item === undefined || selection.size === 0) return [];
  const verdict: Verdict = {
    questionId: item.question.id,
    revision: item.question.revision,
    correct: isCorrect(item.question, selection),
    at,
  };
  return [{ type: "answer-judged", verdict }];
}

function unchanged(session: Session): Outcome {
  return { session, events: [] };
}

function finish(session: Session, endedAt: number, ending: Ending): Outcome {
  const verdicts =
    policyOf(session).feedback === "deferred"
      ? session.plan.items.flatMap((_, index) => judged(session, index, endedAt))
      : [];
  return {
    session: { ...session, stage: { kind: "finished", endedAt, ending } },
    events: [...verdicts, { type: "session-finished", ending, at: endedAt }],
  };
}

function toggle(session: Session, choiceId: ChoiceId): Outcome {
  const item = currentItem(session);
  if (session.stage.kind !== "answering" || !item.choices.some((choice) => choice.id === choiceId)) {
    return unchanged(session);
  }
  const current = selectionAt(session, session.cursor);
  let next: Selection;
  if (item.question.kind === "single") {
    if (current.size === 1 && current.has(choiceId)) return unchanged(session);
    next = new Set([choiceId]);
  } else {
    const flipped = new Set(current);
    if (flipped.has(choiceId)) flipped.delete(choiceId);
    else flipped.add(choiceId);
    next = flipped;
  }
  return {
    session: {
      ...session,
      selections: session.selections.map((selection, index) => (index === session.cursor ? next : selection)),
    },
    events: [],
  };
}

function confirm(session: Session, now: number): Outcome {
  const action = primaryAction(session);
  if (action === null || !action.enabled) return unchanged(session);
  switch (action.kind) {
    case "reveal":
      return { session: { ...session, stage: { kind: "revealed" } }, events: judged(session, session.cursor, now) };
    case "next":
      return { session: { ...session, cursor: session.cursor + 1, stage: { kind: "answering" } }, events: [] };
    case "finish":
      return finish(session, now, "completed");
  }
}

function goTo(session: Session, index: number): Outcome {
  const outOfRange = !Number.isInteger(index) || index < 0 || index >= session.plan.items.length;
  if (policyOf(session).navigation === "linear" || outOfRange || index === session.cursor) {
    return unchanged(session);
  }
  return { session: { ...session, cursor: index }, events: [] };
}

function expire(session: Session, now: number): Outcome {
  const deadline = session.plan.deadlineAt;
  if (deadline === null || now < deadline) return unchanged(session);
  return finish(session, deadline, "timeout");
}

export function handle(session: Session, command: SessionCommand, now: number): Outcome {
  if (isFinished(session)) return unchanged(session);
  switch (command.type) {
    case "toggle":
      return toggle(session, command.choiceId);
    case "confirm":
      return confirm(session, now);
    case "goTo":
      return goTo(session, command.index);
    case "expire":
      return expire(session, now);
  }
}
