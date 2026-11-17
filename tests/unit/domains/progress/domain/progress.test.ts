import { describe, expect, test } from "bun:test";
import {
  EMPTY_PROGRESS,
  addCounts,
  currentFor,
  masteryIn,
  masteryOf,
  record,
  type Progress,
  type QuestionStat,
  type Verdict,
} from "@/domains/progress/domain";
import {
  buildSubject,
  chapterOf,
  demoSubject,
  draftChapter,
  draftQuestion,
  questionOf,
} from "../../../support/subjects";

const subject = demoSubject();
const q1 = questionOf(subject, "ch1-q1");
const q2 = questionOf(subject, "ch1-q2");
const q3 = questionOf(subject, "ch1-q3");

function stat(fields: Partial<QuestionStat> = {}): QuestionStat {
  return { seen: 1, streak: 1, lastCorrect: true, lastAnsweredAt: 0, revision: q1.revision, ...fields };
}

function verdict(correct: boolean, at: number): Verdict {
  return { questionId: q1.id, revision: q1.revision, correct, at };
}

describe("masteryOf", () => {
  test("truth table", () => {
    expect(masteryOf(undefined)).toBe("new");
    expect(masteryOf(stat({ lastCorrect: false, streak: 0 }))).toBe("missed");
    expect(masteryOf(stat({ lastCorrect: true, streak: 1 }))).toBe("learning");
    expect(masteryOf(stat({ lastCorrect: true, streak: 2 }))).toBe("mastered");
    expect(masteryOf(stat({ lastCorrect: true, streak: 5 }))).toBe("mastered");
  });
});

describe("record", () => {
  test("a first answer creates the stat", () => {
    const next = record(EMPTY_PROGRESS, [verdict(true, 10)]);
    expect(next.get(q1.id)).toEqual({
      seen: 1,
      streak: 1,
      lastCorrect: true,
      lastAnsweredAt: 10,
      revision: q1.revision,
    });
  });

  test("the streak grows on success and resets on a mistake", () => {
    const once = record(EMPTY_PROGRESS, [verdict(true, 1), verdict(true, 2)]);
    expect(once.get(q1.id)?.streak).toBe(2);
    expect(masteryOf(once.get(q1.id))).toBe("mastered");
    const reset = record(once, [verdict(false, 3)]);
    expect(reset.get(q1.id)).toEqual({
      seen: 3,
      streak: 0,
      lastCorrect: false,
      lastAnsweredAt: 3,
      revision: q1.revision,
    });
    expect(masteryOf(reset.get(q1.id))).toBe("missed");
  });

  test("the input is not mutated", () => {
    const before: Progress = new Map([[q1.id, stat()]]);
    const next = record(before, [verdict(false, 5)]);
    expect(before.get(q1.id)).toEqual(stat());
    expect(next).not.toBe(before);
  });
});

describe("currentFor", () => {
  test("keeps a stat earned on the current revision", () => {
    const stored: Progress = new Map([[q1.id, stat()]]);
    expect(currentFor(stored, subject).get(q1.id)).toEqual(stat());
  });

  test("a stat earned on another revision reads as never answered", () => {
    const stored: Progress = new Map([[q1.id, stat({ revision: "ancienne" })]]);
    expect(currentFor(stored, subject).get(q1.id)).toBeUndefined();
    expect(masteryOf(currentFor(stored, subject).get(q1.id))).toBe("new");
  });

  test("a corrected answer key drops a mastered stat", () => {
    const before = buildSubject([draftChapter("ch1", 1, [draftQuestion("q", { correct: [1] })])]);
    const after = buildSubject([draftChapter("ch1", 1, [draftQuestion("q", { correct: [2] })])]);
    const question = questionOf(before, "q");
    const stored = record(EMPTY_PROGRESS, [
      { questionId: question.id, revision: question.revision, correct: true, at: 1 },
      { questionId: question.id, revision: question.revision, correct: true, at: 2 },
    ]);
    expect(masteryOf(currentFor(stored, before).get(question.id))).toBe("mastered");
    expect(masteryOf(currentFor(stored, after).get(question.id))).toBe("new");
  });

  test("a stat whose question is absent stays, inert", () => {
    const other = buildSubject([draftChapter("ch9", 9, [draftQuestion("ailleurs")])]);
    const foreign = questionOf(other, "ailleurs");
    const stored: Progress = new Map([[foreign.id, stat({ revision: foreign.revision })]]);
    expect(currentFor(stored, subject).get(foreign.id)).toEqual(stat({ revision: foreign.revision }));
  });

  test("returns the same map when nothing is stale", () => {
    const stored: Progress = new Map([[q1.id, stat()]]);
    expect(currentFor(stored, subject)).toBe(stored);
  });
});

describe("masteryIn", () => {
  test("counts each mastery level over the given questions", () => {
    const progress: Progress = new Map([
      [q1.id, stat({ streak: 2 })],
      [q2.id, stat({ lastCorrect: false, streak: 0, revision: q2.revision })],
    ]);
    expect(masteryIn(chapterOf(subject, "ch1").questions, progress)).toEqual({
      new: 1,
      missed: 1,
      learning: 0,
      mastered: 1,
    });
    expect(q3.chapterId).toBe(chapterOf(subject, "ch1").id);
  });

  test("an empty list counts nothing", () => {
    expect(masteryIn([], EMPTY_PROGRESS)).toEqual({ new: 0, missed: 0, learning: 0, mastered: 0 });
  });
});

describe("addCounts", () => {
  test("adds level by level", () => {
    expect(
      addCounts({ new: 1, missed: 2, learning: 3, mastered: 4 }, { new: 10, missed: 20, learning: 30, mastered: 40 }),
    ).toEqual({ new: 11, missed: 22, learning: 33, mastered: 44 });
  });
});
