import { describe, expect, test } from "bun:test";
import { subjectId, type Question } from "@/domains/catalog/domain";
import { EMPTY_PROGRESS, type Progress, type QuestionStat } from "@/domains/progress/domain";
import {
  DRAW_WEIGHT,
  drawPool,
  planSession,
  seededRng,
  shuffle,
  weightOf,
  type SessionPlan,
  type SessionRequest,
} from "@/domains/session/domain";
import {
  allChapterIds,
  buildSubject,
  chapterOf,
  demoSubject,
  draftChapter,
  draftQuestion,
  questionOf,
} from "../../../support/subjects";

const DAY = 24 * 60 * 60 * 1000;
const now = 100 * DAY;
const subject = demoSubject();

function request(fields: Partial<SessionRequest> = {}): SessionRequest {
  return { subjectId: subject.id, chapterIds: allChapterIds(subject), count: 20, mode: "training", ...fields };
}

function statOf(question: Question, fields: Partial<QuestionStat>): QuestionStat {
  return { seen: 1, streak: 1, lastCorrect: true, lastAnsweredAt: now, revision: question.revision, ...fields };
}

function fingerprint(plan: SessionPlan | null): string[] {
  return (plan?.items ?? []).map((item) => `${item.question.id}:${item.choices.map((choice) => choice.id).join(",")}`);
}

describe("planSession", () => {
  test("the same seed gives the same plan, two seeds give different plans", () => {
    const first = planSession(subject, EMPTY_PROGRESS, request(), now, seededRng(42));
    const again = planSession(subject, EMPTY_PROGRESS, request(), now, seededRng(42));
    const other = planSession(subject, EMPTY_PROGRESS, request(), now, seededRng(7));
    expect(fingerprint(first)).toEqual(fingerprint(again));
    expect(fingerprint(first)).not.toEqual(fingerprint(other));
  });

  test("no question appears twice and the count is clamped to the pool", () => {
    const plan = planSession(subject, EMPTY_PROGRESS, request({ count: 50 }), now, seededRng(1));
    const ids = (plan?.items ?? []).map((item) => item.question.id);
    expect(ids.length).toBe(subject.questions.size);
    expect(new Set(ids).size).toBe(ids.length);
    const small = planSession(subject, EMPTY_PROGRESS, request({ count: 2 }), now, seededRng(1));
    expect(small?.items.length).toBe(2);
    const zero = planSession(subject, EMPTY_PROGRESS, request({ count: 0 }), now, seededRng(1));
    expect(zero?.items.length).toBe(1);
  });

  test("the plan's request carries the count actually drawn, so it can be stored and replayed", () => {
    const all = planSession(subject, EMPTY_PROGRESS, request({ count: Number.POSITIVE_INFINITY }), now, seededRng(1));
    expect(all?.request.count).toBe(subject.questions.size);
    const none = planSession(subject, EMPTY_PROGRESS, request({ count: 0 }), now, seededRng(1));
    expect(none?.request.count).toBe(1);
    const odd = planSession(subject, EMPTY_PROGRESS, request({ count: Number.NaN }), now, seededRng(1));
    expect(odd?.request.count).toBe(1);
  });

  test("only the requested chapters are drawn", () => {
    const ch2 = chapterOf(subject, "ch2");
    const plan = planSession(subject, EMPTY_PROGRESS, request({ chapterIds: [ch2.id] }), now, seededRng(3));
    expect(plan?.items.every((item) => item.question.chapterId === ch2.id)).toBe(true);
    expect(plan?.items.length).toBe(ch2.questions.length);
  });

  test("a missed question is drawn more often than a new one, a new one more than a mastered one", () => {
    const weighted = buildSubject([
      draftChapter("ch", 1, [draftQuestion("rate"), draftQuestion("neuve"), draftQuestion("maitrisee")]),
    ]);
    const missed = questionOf(weighted, "rate");
    const fresh = questionOf(weighted, "neuve");
    const mastered = questionOf(weighted, "maitrisee");
    const progress: Progress = new Map([
      [missed.id, statOf(missed, { streak: 0, lastCorrect: false })],
      [mastered.id, statOf(mastered, { streak: 3 })],
    ]);
    const rng = seededRng(2024);
    const picks = new Map<string, number>();
    for (let draw = 0; draw < 2000; draw += 1) {
      const plan = planSession(
        weighted,
        progress,
        { subjectId: weighted.id, chapterIds: allChapterIds(weighted), count: 1, mode: "training" },
        now,
        rng,
      );
      const picked = plan?.items[0].question.id ?? "aucune";
      picks.set(picked, (picks.get(picked) ?? 0) + 1);
    }
    const missedCount = picks.get(missed.id) ?? 0;
    const freshCount = picks.get(fresh.id) ?? 0;
    const masteredCount = picks.get(mastered.id) ?? 0;
    expect(missedCount).toBeGreaterThan(freshCount);
    expect(freshCount).toBeGreaterThan(masteredCount);
    expect(masteredCount).toBeGreaterThan(0);
  });

  test("the shuffle permutes choices and cannot move the answer key", () => {
    const plan = planSession(subject, EMPTY_PROGRESS, request(), now, seededRng(9));
    for (const item of plan?.items ?? []) {
      const original = questionOf(subject, item.question.id);
      expect(item.question).toBe(original);
      expect([...item.choices].sort((a, b) => a.id - b.id)).toEqual([...original.choices]);
      const keyTexts = item.choices.filter((choice) => original.answer.has(choice.id)).map((choice) => choice.text);
      const authoredTexts = original.choices
        .filter((choice) => original.answer.has(choice.id))
        .map((choice) => choice.text);
      expect(new Set(keyTexts)).toEqual(new Set(authoredTexts));
    }
  });

  test("an exam gets a deadline of sixty seconds per question, training none", () => {
    const exam = planSession(subject, EMPTY_PROGRESS, request({ mode: "exam", count: 3 }), now, seededRng(5));
    expect(exam?.deadlineAt).toBe(now + 3 * 60 * 1000);
    expect(exam?.startedAt).toBe(now);
    const training = planSession(subject, EMPTY_PROGRESS, request({ count: 3 }), now, seededRng(5));
    expect(training?.deadlineAt).toBeNull();
  });

  test("redo draws only missed questions", () => {
    const missed = questionOf(subject, "ch1-q2");
    const learning = questionOf(subject, "ch2-q1");
    const progress: Progress = new Map([
      [missed.id, statOf(missed, { streak: 0, lastCorrect: false })],
      [learning.id, statOf(learning, { streak: 1 })],
    ]);
    const plan = planSession(subject, progress, request({ mode: "redo" }), now, seededRng(11));
    expect(plan?.items.map((item) => item.question.id)).toEqual([missed.id]);
    expect(drawPool(subject, progress, allChapterIds(subject), "redo")).toEqual([missed]);
  });

  test("an empty pool returns null", () => {
    expect(planSession(subject, EMPTY_PROGRESS, request({ mode: "redo" }), now, seededRng(1))).toBeNull();
    expect(drawPool(subject, EMPTY_PROGRESS, [], "training")).toEqual([]);
  });

  test("a chapter asked twice is drawn once", () => {
    const ch1 = chapterOf(subject, "ch1");
    expect(drawPool(subject, EMPTY_PROGRESS, [ch1.id, ch1.id], "exam")).toEqual(ch1.questions);
  });

  test("a request for another subject returns null", () => {
    expect(
      planSession(subject, EMPTY_PROGRESS, request({ subjectId: subjectId("ailleurs") }), now, seededRng(1)),
    ).toBeNull();
  });
});

describe("weights", () => {
  test("every weight stays above zero, whatever the age of the stat", () => {
    const question = questionOf(subject, "ch1-q1");
    const stats: (QuestionStat | undefined)[] = [
      undefined,
      statOf(question, { streak: 0, lastCorrect: false }),
      statOf(question, { streak: 1 }),
      statOf(question, { streak: 2 }),
      statOf(question, { streak: 2, lastAnsweredAt: now + 30 * DAY }),
      statOf(question, { streak: 2, lastAnsweredAt: 0 }),
    ];
    for (const stat of stats) expect(weightOf(stat, now)).toBeGreaterThan(0);
  });

  test("a mastered question regains weight as it ages, capped at double", () => {
    const question = questionOf(subject, "ch1-q1");
    const fresh = weightOf(statOf(question, { streak: 2 }), now);
    const week = weightOf(statOf(question, { streak: 2, lastAnsweredAt: now - 7 * DAY }), now);
    const month = weightOf(statOf(question, { streak: 2, lastAnsweredAt: now - 30 * DAY }), now);
    expect(fresh).toBe(DRAW_WEIGHT.mastered);
    expect(week).toBe(2 * DRAW_WEIGHT.mastered);
    expect(month).toBe(week);
  });
});

describe("shuffle", () => {
  test("does not mutate its input and keeps every element", () => {
    const input = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8]);
    const output = shuffle(input, seededRng(4));
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(output).not.toBe(input);
    expect([...output].sort((a, b) => a - b)).toEqual([...input]);
  });

  test("an rng in [0, 1) never escapes the array", () => {
    const output = shuffle(["a", "b", "c"], () => 0.9999999999);
    expect([...output].sort()).toEqual(["a", "b", "c"]);
  });
});

describe("seededRng", () => {
  test("yields values in [0, 1)", () => {
    const rng = seededRng(123);
    for (let index = 0; index < 1000; index += 1) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  test("a seed draws the plan the previous build drew with it", () => {
    const plan = planSession(subject, EMPTY_PROGRESS, request({ mode: "exam", count: 3 }), 1000, seededRng(77));
    expect(fingerprint(plan)).toEqual(["ch1-q3:1,2,0,3", "ch2-q1:2,0,1,3", "ch1-q1:3,0,1,2"]);
  });
});
