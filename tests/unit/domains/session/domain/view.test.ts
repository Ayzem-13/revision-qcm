import { describe, expect, test } from "bun:test";
import type { ChoiceId, Question } from "@/domains/catalog/domain";
import {
  begin,
  handle,
  isCorrect,
  viewOf,
  type QuestionView,
  type ResultsView,
  type Session,
  type SessionCommand,
} from "@/domains/session/domain";
import {
  chapterOf,
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
const other = questionOf(subject, "ch2-q1");

function ids(question: Question, indexes: readonly number[]): ReadonlySet<ChoiceId> {
  return new Set(indexes.map((index) => choiceAt(question, index).id));
}

function run(session: Session, commands: readonly SessionCommand[], now = 2000): Session {
  return commands.reduce((current, command) => handle(current, command, now).session, session);
}

function select(question: Question, index: number): SessionCommand {
  return { type: "toggle", choiceId: choiceAt(question, index).id };
}

function questionView(session: Session): QuestionView {
  const view = viewOf(session, subject);
  if (view.kind !== "question") throw new Error(`vue inattendue : ${view.kind}`);
  return view;
}

function resultsView(session: Session): ResultsView {
  const view = viewOf(session, subject);
  if (view.kind !== "results") throw new Error(`vue inattendue : ${view.kind}`);
  return view;
}

describe("isCorrect", () => {
  test("is exact set equality", () => {
    expect(isCorrect(single, ids(single, [1]))).toBe(true);
    expect(isCorrect(single, ids(single, [0]))).toBe(false);
    expect(isCorrect(multi, ids(multi, [0, 2]))).toBe(true);
    expect(isCorrect(multi, ids(multi, [2, 0]))).toBe(true);
  });

  test("a subset, a superset and an empty selection are wrong", () => {
    expect(isCorrect(multi, ids(multi, [0]))).toBe(false);
    expect(isCorrect(multi, ids(multi, [0, 1, 2]))).toBe(false);
    expect(isCorrect(multi, new Set())).toBe(false);
    expect(isCorrect(single, new Set())).toBe(false);
  });
});

describe("the results view", () => {
  const plan = planOf(subject, [single, multi, other], "exam");

  test("the mark is out of 20, rounded to the half point, and unanswered counts against it", () => {
    const oneRight = resultsView(
      run(begin(plan), [select(single, 1), { type: "goTo", index: 2 }, { type: "confirm" }], 61_000),
    );
    expect(oneRight.correct).toBe(1);
    expect(oneRight.total).toBe(3);
    expect(oneRight.markOutOf20).toBe(6.5);
    expect(oneRight.durationMs).toBe(61_000 - START);
    expect(oneRight.ending).toBe("completed");
    expect(oneRight.reviewed.map((question) => question.outcome)).toEqual(["correct", "unanswered", "unanswered"]);
    expect(oneRight.mistakes.map((question) => question.id)).toEqual([multi.id, other.id]);

    const twoRight = resultsView(
      run(
        begin(plan),
        [
          select(single, 1),
          { type: "confirm" },
          select(multi, 0),
          select(multi, 2),
          { type: "confirm" },
          { type: "confirm" },
        ],
        5000,
      ),
    );
    expect(twoRight.markOutOf20).toBe(13.5);
  });

  test("a wrong answer is a mistake whose choices carry their marks in the order they were shown", () => {
    const results = resultsView(run(begin(plan), [select(single, 0), { type: "goTo", index: 2 }, { type: "confirm" }]));
    const [first] = results.mistakes;
    expect(first?.outcome).toBe("wrong");
    expect(first?.number).toBe(1);
    expect(first?.choices.map((choice) => choice.id)).toEqual(single.choices.map((choice) => choice.id));
    expect(first?.choices.map((choice) => choice.mark)).toEqual(["wrong", "missed", "neutral", "neutral"]);
    expect(first?.explanation).toEqual(single.explanation);
  });

  test("an unanswered question marks its answer as missed and nothing as chosen", () => {
    const results = resultsView(run(begin(plan), [{ type: "goTo", index: 2 }, { type: "confirm" }]));
    const reviewed = results.reviewed[1];
    expect(reviewed?.outcome).toBe("unanswered");
    expect(reviewed?.choices.map((choice) => choice.mark)).toEqual(["missed", "neutral", "missed", "neutral"]);
  });

  test("byChapter follows subject order, holds only present chapters, and adds up to the total", () => {
    const reversed = planOf(subject, [other, single], "exam");
    const results = resultsView(run(begin(reversed), [select(other, 0), { type: "confirm" }, { type: "confirm" }]));
    expect(results.byChapter.map((score) => score.chapterId)).toEqual([
      chapterOf(subject, "ch1").id,
      chapterOf(subject, "ch2").id,
    ]);
    expect(results.byChapter.map((score) => score.title)).toEqual([
      chapterOf(subject, "ch1").title,
      chapterOf(subject, "ch2").title,
    ]);
    expect(results.byChapter.reduce((sum, score) => sum + score.total, 0)).toBe(results.total);
    expect(results.byChapter.reduce((sum, score) => sum + score.correct, 0)).toBe(results.correct);

    const onlyFirst = resultsView(
      run(begin(planOf(subject, [single, multi], "exam")), [{ type: "confirm" }, { type: "confirm" }]),
    );
    expect(onlyFirst.byChapter.map((score) => score.chapterId)).toEqual([chapterOf(subject, "ch1").id]);
  });

  test("a finished session carries its setup and policy, without the subject", () => {
    const training = planOf(subject, [single], "training");
    const results = resultsView(
      run(begin(training), [
        { type: "toggle", choiceId: wrongChoice(single).id },
        { type: "confirm" },
        { type: "confirm" },
      ]),
    );
    expect(results.setup).toEqual({
      chapterIds: training.request.chapterIds,
      count: training.request.count,
      mode: training.request.mode,
    });
    expect(results.correct).toBe(0);
    expect(results.policy.feedback).toBe("immediate");
  });

  test("a timeout ends at the deadline", () => {
    const deadline = START + 3 * 60 * 1000;
    const results = resultsView(run(begin(plan), [{ type: "expire" }], deadline + 10_000));
    expect(results.ending).toBe("timeout");
    expect(results.durationMs).toBe(deadline - START);
  });
});

describe("the question view", () => {
  test("deferred feedback never yields a mark nor any feedback", () => {
    const plan = planOf(subject, [single, multi, other], "exam");
    const commands: SessionCommand[] = [
      select(single, 1),
      { type: "confirm" },
      select(multi, 0),
      select(multi, 1),
      { type: "goTo", index: 0 },
      select(single, 0),
      { type: "goTo", index: 2 },
      ...correctChoices(other).map((choice): SessionCommand => ({ type: "toggle", choiceId: choice.id })),
    ];
    let session = begin(plan);
    for (const command of commands) {
      session = handle(session, command, 2000).session;
      const view = questionView(session);
      expect(view.feedback).toBeNull();
      expect(view.choices.every((choice) => choice.mark === null)).toBe(true);
    }
  });

  test("an unrevealed training question carries no mark", () => {
    const view = questionView(run(begin(planOf(subject, [multi], "training")), [select(multi, 0)]));
    expect(view.choices.map((choice) => choice.mark)).toEqual([null, null, null, null]);
    expect(view.choices.map((choice) => choice.selected)).toEqual([true, false, false, false]);
    expect(view.feedback).toBeNull();
  });

  test("a revealed training question shows the truth table and its feedback", () => {
    const view = questionView(
      run(begin(planOf(subject, [multi], "training")), [select(multi, 0), select(multi, 1), { type: "confirm" }]),
    );
    expect(view.choices.map((choice) => choice.mark)).toEqual(["correct", "wrong", "missed", "neutral"]);
    expect(view.feedback?.correct).toBe(false);
    expect(view.feedback?.explanation).toEqual(multi.explanation);
  });

  test("numbers choices from 1 and reports progress, never correctness", () => {
    const view = questionView(
      run(begin(planOf(subject, [single, other], "exam")), [select(single, 2), { type: "confirm" }]),
    );
    expect(view.choices.map((choice) => choice.key)).toEqual([1, 2, 3, 4]);
    expect(view.index).toBe(1);
    expect(view.total).toBe(2);
    expect(view.answered).toEqual([true, false]);
    expect(view.answeredCount).toBe(1);
    expect(view.chapterTitle).toBe(chapterOf(subject, "ch2").title);
    expect(view.question.id).toBe(other.id);
    expect(view.deadlineAt).toBe(START + 2 * 60 * 1000);
    expect(view.primary).toEqual({ kind: "finish", enabled: true });
    expect("answer" in view.question).toBe(false);
    expect("revision" in view.question).toBe(false);
  });
});
