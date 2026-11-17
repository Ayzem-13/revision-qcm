import { describe, expect, test } from "bun:test";
import { chapterId } from "@/domains/catalog/domain";
import { EMPTY_PROGRESS } from "@/domains/progress/domain";
import {
  begin,
  handle,
  planSession,
  restore,
  seededRng,
  snapshotOf,
  type Session,
  type SessionCommand,
  type SessionPlan,
  type SessionSnapshot,
} from "@/domains/session/domain";
import { allChapterIds, demoSpec, demoSubject, editedDemo, subjectFromSpec } from "../../../support/subjects";

const subject = demoSubject();

function shuffledPlan(mode: "training" | "exam"): SessionPlan {
  const plan = planSession(
    subject,
    EMPTY_PROGRESS,
    { subjectId: subject.id, chapterIds: allChapterIds(subject), count: 4, mode },
    1000,
    seededRng(77),
  );
  if (plan === null) throw new Error("plan vide");
  return plan;
}

function firstChoice(session: Session): SessionCommand {
  const item = session.plan.items[session.cursor];
  const choice = item?.choices[0];
  if (choice === undefined) throw new Error("aucun choix");
  return { type: "toggle", choiceId: choice.id };
}

function step(session: Session, command: SessionCommand | ((current: Session) => SessionCommand), now = 2000): Session {
  return handle(session, typeof command === "function" ? command(session) : command, now).session;
}

function trainingStages(): Session[] {
  const answering = begin(shuffledPlan("training"));
  const selected = step(answering, firstChoice);
  const revealed = step(selected, { type: "confirm" });
  const next = step(revealed, { type: "confirm" });
  let finished = next;
  for (let guard = 0; guard < 20 && finished.stage.kind !== "finished"; guard += 1) {
    finished = step(step(finished, firstChoice), { type: "confirm" }, 3000 + guard);
  }
  return [answering, selected, revealed, next, finished];
}

function examStages(): Session[] {
  const answering = begin(shuffledPlan("exam"));
  const selected = step(answering, firstChoice);
  const moved = step(selected, { type: "goTo", index: 3 });
  const timedOut = step(step(moved, firstChoice), { type: "expire" }, Number.MAX_SAFE_INTEGER);
  return [answering, selected, moved, timedOut];
}

function withSnapshot(session: Session, change: (snapshot: SessionSnapshot) => SessionSnapshot): Session | null {
  return restore(change(snapshotOf(session)), subject);
}

describe("restore(snapshotOf(session))", () => {
  test("gives the session back at every stage of a training", () => {
    const stages = trainingStages();
    expect(stages.map((session) => session.stage.kind)).toEqual([
      "answering",
      "answering",
      "revealed",
      "answering",
      "finished",
    ]);
    for (const session of stages) expect(restore(snapshotOf(session), subject)).toEqual(session);
  });

  test("gives the session back at every stage of an exam", () => {
    const stages = examStages();
    expect(stages.at(-1)?.stage.kind).toBe("finished");
    for (const session of stages) expect(restore(snapshotOf(session), subject)).toEqual(session);
  });

  test("survives a JSON round trip", () => {
    for (const session of [...trainingStages(), ...examStages()]) {
      const stored: SessionSnapshot = JSON.parse(JSON.stringify(snapshotOf(session)));
      expect(restore(stored, subject)).toEqual(session);
    }
  });

  test("restored items share the subject's question objects", () => {
    const session = begin(shuffledPlan("training"));
    const restored = restore(snapshotOf(session), subject);
    expect(restored?.plan.items[0].question).toBe(session.plan.items[0].question);
  });
});

describe("restore refuses a snapshot that no longer matches the content", () => {
  const session = step(begin(shuffledPlan("exam")), firstChoice);
  const removedId = session.plan.items[0].question.id;

  test("an identical reload of the content restores", () => {
    expect(restore(snapshotOf(session), demoSubject())).toEqual(restore(snapshotOf(session), subject));
    expect(restore(snapshotOf(session), demoSubject())).not.toBeNull();
  });

  test("a removed question", () => {
    const edited = subjectFromSpec(
      demoSpec().map((chapter) => ({
        ...chapter,
        questions: [
          ...chapter.questions.filter((question) => question.id !== removedId),
          { id: `${chapter.id}-nouvelle` },
        ],
      })),
    );
    expect(edited.questions.has(removedId)).toBe(false);
    expect(restore(snapshotOf(session), edited)).toBeNull();
  });

  test("a question whose revision changed", () => {
    const edited = editedDemo(removedId, { prompt: "Énoncé corrigé ?" });
    expect(edited.questions.get(removedId)?.revision).not.toBe(session.plan.items[0].question.revision);
    expect(restore(snapshotOf(session), edited)).toBeNull();
  });

  test("a foreign subject", () => {
    expect(restore(snapshotOf(session), demoSubject("autre"))).toBeNull();
  });

  test("a chapter that no longer exists, or no chapter at all", () => {
    expect(
      withSnapshot(session, (snapshot) => ({
        ...snapshot,
        chapterIds: [...snapshot.chapterIds, chapterId("disparu")],
      })),
    ).toBeNull();
    expect(withSnapshot(session, (snapshot) => ({ ...snapshot, chapterIds: [] }))).toBeNull();
  });

  test("a choice order that is not a permutation", () => {
    const [first, ...rest] = snapshotOf(session).items;
    if (first === undefined) throw new Error("aucun élément");
    const broken = (choiceOrder: SessionSnapshot["items"][number]["choiceOrder"]): Session | null =>
      withSnapshot(session, (snapshot) => ({ ...snapshot, items: [{ ...first, choiceOrder }, ...rest] }));
    expect(broken(first.choiceOrder.slice(1))).toBeNull();
    const [head] = first.choiceOrder;
    if (head === undefined) throw new Error("aucun choix");
    expect(broken([head, ...first.choiceOrder.slice(0, -1)])).toBeNull();
    expect(broken(first.choiceOrder)).toEqual(session);
  });

  test("a selection outside the item's choices", () => {
    const [first, ...rest] = snapshotOf(session).items;
    if (first === undefined) throw new Error("aucun élément");
    const extra = [...first.selected, ...first.choiceOrder];
    expect(
      withSnapshot(session, (snapshot) => ({ ...snapshot, items: [{ ...first, selected: extra }, ...rest] })),
    ).toBeNull();
  });

  test("a cursor out of range", () => {
    expect(withSnapshot(session, (snapshot) => ({ ...snapshot, cursor: snapshot.items.length }))).toBeNull();
    expect(withSnapshot(session, (snapshot) => ({ ...snapshot, cursor: -1 }))).toBeNull();
  });

  test("an empty item list", () => {
    expect(withSnapshot(session, (snapshot) => ({ ...snapshot, items: [], cursor: 0 }))).toBeNull();
  });

  test("a revealed stage under deferred feedback", () => {
    expect(withSnapshot(session, (snapshot) => ({ ...snapshot, stage: { kind: "revealed" } }))).toBeNull();
  });
});
