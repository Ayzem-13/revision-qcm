import { describe, expect, test } from "bun:test";
import type { Question } from "@/domains/catalog/domain";
import { begin, handle, isFinished, primaryAction, type Session, type SessionCommand } from "@/domains/session/domain";
import {
  choiceAt,
  correctChoices,
  demoSubject,
  planOf,
  questionOf,
  START,
  wrongChoice,
} from "../../../support/subjects";

const subject = demoSubject();
const single = questionOf(subject, "ch1-q1");
const multi = questionOf(subject, "ch1-q2");
const fiveChoices = questionOf(subject, "ch2-q2");

function run(session: Session, commands: readonly SessionCommand[], now = 2000): Session {
  return commands.reduce((current, command) => handle(current, command, now).session, session);
}

function toggle(question: Question, index: number): SessionCommand {
  return { type: "toggle", choiceId: choiceAt(question, index).id };
}

function judged(question: Question, correct: boolean, at: number) {
  return {
    type: "answer-judged" as const,
    verdict: { questionId: question.id, revision: question.revision, correct, at },
  };
}

describe("training", () => {
  const plan = planOf(subject, [single, multi], "training");

  test("begins on the first item with nothing selected", () => {
    const session = begin(plan);
    expect(session.cursor).toBe(0);
    expect(session.stage).toEqual({ kind: "answering" });
    expect(session.selections.map((selection) => selection.size)).toEqual([0, 0]);
  });

  test("confirm with an empty selection is ignored", () => {
    const session = begin(plan);
    const outcome = handle(session, { type: "confirm" }, 2000);
    expect(outcome.session).toBe(session);
    expect(outcome.events).toEqual([]);
    expect(primaryAction(session)).toEqual({ kind: "reveal", enabled: false });
  });

  test("toggle, reveal judges one answer, toggle after reveal is ignored, confirm advances, finish judges nothing more", () => {
    const answered = run(begin(plan), [
      { type: "toggle", choiceId: correctChoices(single)[0]?.id ?? choiceAt(single, 0).id },
    ]);
    expect(primaryAction(answered)).toEqual({ kind: "reveal", enabled: true });

    const revealed = handle(answered, { type: "confirm" }, 3000);
    expect(revealed.session.stage).toEqual({ kind: "revealed" });
    expect(revealed.events).toEqual([judged(single, true, 3000)]);

    const ignored = handle(revealed.session, toggle(single, 3), 3100);
    expect(ignored.session).toBe(revealed.session);
    expect(ignored.events).toEqual([]);

    expect(primaryAction(revealed.session)).toEqual({ kind: "next", enabled: true });
    const advanced = handle(revealed.session, { type: "confirm" }, 4000);
    expect(advanced.session.cursor).toBe(1);
    expect(advanced.session.stage).toEqual({ kind: "answering" });
    expect(advanced.events).toEqual([]);

    const wrong = run(advanced.session, [{ type: "toggle", choiceId: wrongChoice(multi).id }]);
    const lastReveal = handle(wrong, { type: "confirm" }, 5000);
    expect(lastReveal.events).toEqual([judged(multi, false, 5000)]);
    expect(primaryAction(lastReveal.session)).toEqual({ kind: "finish", enabled: true });

    const finished = handle(lastReveal.session, { type: "confirm" }, 6000);
    expect(finished.session.stage).toEqual({ kind: "finished", endedAt: 6000, ending: "completed" });
    expect(finished.events).toEqual([{ type: "session-finished", ending: "completed", at: 6000 }]);
    expect(primaryAction(finished.session)).toBeNull();
  });

  test("training ignores goTo", () => {
    const session = begin(plan);
    expect(handle(session, { type: "goTo", index: 1 }, 2000).session).toBe(session);
  });

  test("training ignores expire", () => {
    const session = begin(plan);
    expect(handle(session, { type: "expire" }, Number.MAX_SAFE_INTEGER).session).toBe(session);
  });

  test("a choice that is not in the current item is ignored", () => {
    const session = begin(plan);
    expect(handle(session, toggle(fiveChoices, 4), 2000).session).toBe(session);
  });
});

describe("selection", () => {
  test("single replaces the selection", () => {
    const session = run(begin(planOf(subject, [single], "training")), [toggle(single, 0), toggle(single, 2)]);
    expect([...(session.selections[0] ?? [])]).toEqual([choiceAt(single, 2).id]);
  });

  test("single keeps a choice selected when it is toggled again, and emits nothing", () => {
    const once = run(begin(planOf(subject, [single], "training")), [toggle(single, 0)]);
    const again = handle(once, toggle(single, 0), 2000);
    expect(again.session).toBe(once);
    expect([...(again.session.selections[0] ?? [])]).toEqual([choiceAt(single, 0).id]);
  });

  test("multi flips membership", () => {
    const session = run(begin(planOf(subject, [multi], "training")), [
      toggle(multi, 0),
      toggle(multi, 2),
      toggle(multi, 0),
    ]);
    expect([...(session.selections[0] ?? [])]).toEqual([choiceAt(multi, 2).id]);
  });
});

describe("exam", () => {
  const plan = planOf(subject, [single, multi, fiveChoices], "exam");
  const deadline = START + 3 * 60 * 1000;

  test("confirm never reveals and an empty answer is a skip", () => {
    const session = begin(plan);
    expect(primaryAction(session)).toEqual({ kind: "next", enabled: true });
    const skipped = handle(session, { type: "confirm" }, 2000);
    expect(skipped.session.cursor).toBe(1);
    expect(skipped.session.stage).toEqual({ kind: "answering" });
    expect(skipped.events).toEqual([]);
    const answered = run(skipped.session, [toggle(multi, 0), { type: "confirm" }]);
    expect(answered.stage).toEqual({ kind: "answering" });
    expect(answered.cursor).toBe(2);
  });

  test("goTo moves freely and answers stay editable", () => {
    const session = run(begin(plan), [
      toggle(single, 0),
      { type: "goTo", index: 2 },
      toggle(fiveChoices, 1),
      { type: "goTo", index: 0 },
      toggle(single, 3),
    ]);
    expect(session.cursor).toBe(0);
    expect([...(session.selections[0] ?? [])]).toEqual([choiceAt(single, 3).id]);
    expect([...(session.selections[2] ?? [])]).toEqual([choiceAt(fiveChoices, 1).id]);
  });

  test("goTo out of range, fractional or to the current item is ignored", () => {
    const session = begin(plan);
    expect(handle(session, { type: "goTo", index: 3 }, 2000).session).toBe(session);
    expect(handle(session, { type: "goTo", index: -1 }, 2000).session).toBe(session);
    expect(handle(session, { type: "goTo", index: 1.5 }, 2000).session).toBe(session);
    expect(handle(session, { type: "goTo", index: 0 }, 2000).session).toBe(session);
  });

  test("finish judges only the answered items, then reports the end", () => {
    const session = run(begin(plan), [
      { type: "toggle", choiceId: choiceAt(single, 1).id },
      { type: "goTo", index: 2 },
      toggle(fiveChoices, 0),
    ]);
    expect(primaryAction(session)).toEqual({ kind: "finish", enabled: true });
    const finished = handle(session, { type: "confirm" }, 9000);
    expect(finished.session.stage).toEqual({ kind: "finished", endedAt: 9000, ending: "completed" });
    expect(finished.events).toEqual([
      judged(single, true, 9000),
      judged(fiveChoices, false, 9000),
      { type: "session-finished", ending: "completed", at: 9000 },
    ]);
  });

  test("expire before the deadline is ignored", () => {
    const session = begin(plan);
    const early = handle(session, { type: "expire" }, deadline - 1);
    expect(early.session).toBe(session);
    expect(early.events).toEqual([]);
  });

  test("expire at the deadline finishes with a timeout ending at the deadline", () => {
    const session = run(begin(plan), [toggle(single, 1)]);
    const late = handle(session, { type: "expire" }, deadline + 5000);
    expect(late.session.stage).toEqual({ kind: "finished", endedAt: deadline, ending: "timeout" });
    expect(late.events).toEqual([
      judged(single, true, deadline),
      { type: "session-finished", ending: "timeout", at: deadline },
    ]);
  });
});

describe("a finished session", () => {
  test("returns the same object and no event for every command", () => {
    const finished = handle(begin(planOf(subject, [single], "exam")), { type: "confirm" }, 2000).session;
    expect(isFinished(finished)).toBe(true);
    const commands: SessionCommand[] = [
      toggle(single, 0),
      { type: "confirm" },
      { type: "goTo", index: 0 },
      { type: "expire" },
    ];
    for (const command of commands) {
      const outcome = handle(finished, command, Number.MAX_SAFE_INTEGER);
      expect(outcome.session).toBe(finished);
      expect(outcome.events).toEqual([]);
    }
  });

  test("an unfinished session is not finished", () => {
    expect(isFinished(begin(planOf(subject, [single, multi], "exam")))).toBe(false);
  });
});
