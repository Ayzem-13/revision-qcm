import type {
  ChapterId,
  ChoiceId,
  Difficulty,
  Question,
  QuestionId,
  RichText,
  Subject,
} from "@/domains/catalog/domain";
import type { ModePolicy } from "./mode";
import type { SessionItem, SessionSetup } from "./plan";
import { isCorrect } from "./scoring";
import {
  currentItem,
  isFinished,
  policyOf,
  primaryAction,
  selectionAt,
  type Ending,
  type FinishedSession,
  type PrimaryAction,
  type Selection,
  type Session,
} from "./session";

export type ChoiceMark = "correct" | "wrong" | "missed" | "neutral";

export type ChoiceView = {
  readonly id: ChoiceId;
  readonly key: number;
  readonly text: RichText;
  readonly selected: boolean;
  readonly mark: ChoiceMark | null;
};

type Feedback = { readonly correct: boolean; readonly explanation: RichText };

export type QuestionView = {
  readonly kind: "question";
  readonly policy: ModePolicy;
  readonly index: number;
  readonly total: number;
  readonly answeredCount: number;
  readonly answered: readonly boolean[];
  readonly question: {
    readonly id: QuestionId;
    readonly kind: "single" | "multi";
    readonly prompt: RichText;
    readonly code: string | null;
    readonly difficulty: Difficulty;
  };
  readonly chapterTitle: string;
  readonly choices: readonly ChoiceView[];
  readonly feedback: Feedback | null;
  readonly primary: PrimaryAction;
  readonly deadlineAt: number | null;
};

export type ReviewedQuestion = {
  readonly number: number;
  readonly id: QuestionId;
  readonly prompt: RichText;
  readonly code: string | null;
  readonly explanation: RichText;
  readonly outcome: "correct" | "wrong" | "unanswered";
  readonly choices: readonly { readonly id: ChoiceId; readonly text: RichText; readonly mark: ChoiceMark }[];
};

export type ChapterScore = {
  readonly chapterId: ChapterId;
  readonly title: string;
  readonly correct: number;
  readonly total: number;
};

export type ResultsView = {
  readonly kind: "results";
  readonly policy: ModePolicy;
  readonly setup: SessionSetup;
  readonly ending: Ending;
  readonly correct: number;
  readonly total: number;
  readonly markOutOf20: number;
  readonly durationMs: number;
  readonly byChapter: readonly ChapterScore[];
  readonly reviewed: readonly ReviewedQuestion[];
  readonly mistakes: readonly ReviewedQuestion[];
};

export type SessionView = QuestionView | ResultsView;

const MARK: Readonly<Record<`${boolean},${boolean}`, ChoiceMark>> = {
  "true,true": "correct",
  "true,false": "wrong",
  "false,true": "missed",
  "false,false": "neutral",
};

function markOf(question: Question, selection: Selection, choiceId: ChoiceId): ChoiceMark {
  return MARK[`${selection.has(choiceId)},${question.answer.has(choiceId)}`];
}

function outcomeOf(question: Question, selection: Selection): ReviewedQuestion["outcome"] {
  if (selection.size === 0) return "unanswered";
  return isCorrect(question, selection) ? "correct" : "wrong";
}

function reviewOf(item: SessionItem, selection: Selection, index: number): ReviewedQuestion {
  const { question } = item;
  return {
    number: index + 1,
    id: question.id,
    prompt: question.prompt,
    code: question.code,
    explanation: question.explanation,
    outcome: outcomeOf(question, selection),
    choices: item.choices.map((choice) => ({
      id: choice.id,
      text: choice.text,
      mark: markOf(question, selection, choice.id),
    })),
  };
}

function resultsOf(session: FinishedSession, subject: Subject): ResultsView {
  const { request, items, startedAt } = session.plan;
  const reviewed = items.map((item, index) => reviewOf(item, selectionAt(session, index), index));
  const tally = new Map<ChapterId, { correct: number; total: number }>();
  items.forEach((item, index) => {
    const entry = tally.get(item.question.chapterId) ?? { correct: 0, total: 0 };
    tally.set(item.question.chapterId, {
      correct: entry.correct + (reviewed[index]?.outcome === "correct" ? 1 : 0),
      total: entry.total + 1,
    });
  });
  const byChapter = subject.sections.flatMap((section) =>
    section.chapters.flatMap((chapter): ChapterScore[] => {
      const entry = tally.get(chapter.id);
      return entry === undefined ? [] : [{ chapterId: chapter.id, title: chapter.title, ...entry }];
    }),
  );
  const correct = reviewed.filter((question) => question.outcome === "correct").length;
  const total = reviewed.length;
  return {
    kind: "results",
    policy: policyOf(session),
    setup: { chapterIds: request.chapterIds, count: request.count, mode: request.mode },
    ending: session.stage.ending,
    correct,
    total,
    markOutOf20: Math.round((correct / total) * 40) / 2,
    durationMs: session.stage.endedAt - startedAt,
    byChapter,
    reviewed,
    mistakes: reviewed.filter((question) => question.outcome !== "correct"),
  };
}

const FINISH: PrimaryAction = { kind: "finish", enabled: false };

export function viewOf(session: Session, subject: Subject): SessionView {
  if (isFinished(session)) return resultsOf(session, subject);
  const { question, choices } = currentItem(session);
  const selection = selectionAt(session, session.cursor);
  const revealed = session.stage.kind === "revealed";
  const answered = session.plan.items.map((_, index) => selectionAt(session, index).size > 0);
  return {
    kind: "question",
    policy: policyOf(session),
    index: session.cursor,
    total: session.plan.items.length,
    answeredCount: answered.filter(Boolean).length,
    answered,
    question: {
      id: question.id,
      kind: question.kind,
      prompt: question.prompt,
      code: question.code,
      difficulty: question.difficulty,
    },
    chapterTitle: subject.chapters.get(question.chapterId)?.title ?? "",
    choices: choices.map((choice, position) => ({
      id: choice.id,
      key: position + 1,
      text: choice.text,
      selected: selection.has(choice.id),
      mark: revealed ? markOf(question, selection, choice.id) : null,
    })),
    feedback: revealed ? { correct: isCorrect(question, selection), explanation: question.explanation } : null,
    primary: primaryAction(session) ?? FINISH,
    deadlineAt: session.plan.deadlineAt,
  };
}
