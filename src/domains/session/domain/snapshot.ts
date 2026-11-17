import type {
  ChapterId,
  Choice,
  ChoiceId,
  Question,
  QuestionId,
  Revision,
  Subject,
  SubjectId,
} from "@/domains/catalog/domain";
import { MODES, type Mode } from "./mode";
import type { SessionItem } from "./plan";
import { selectionAt, type Ending, type Selection, type Session } from "./session";

export type SessionSnapshot = {
  readonly subjectId: SubjectId;
  readonly mode: Mode;
  readonly chapterIds: readonly ChapterId[];
  readonly count: number;
  readonly startedAt: number;
  readonly deadlineAt: number | null;
  readonly items: readonly {
    readonly questionId: QuestionId;
    readonly revision: Revision;
    readonly choiceOrder: readonly ChoiceId[];
    readonly selected: readonly ChoiceId[];
  }[];
  readonly cursor: number;
  readonly stage:
    | { readonly kind: "answering" }
    | { readonly kind: "revealed" }
    | { readonly kind: "finished"; readonly endedAt: number; readonly ending: Ending };
};

type StoredItem = SessionSnapshot["items"][number];

export function snapshotOf(session: Session): SessionSnapshot {
  const { request, items, startedAt, deadlineAt } = session.plan;
  return {
    subjectId: request.subjectId,
    mode: request.mode,
    chapterIds: [...request.chapterIds],
    count: request.count,
    startedAt,
    deadlineAt,
    items: items.map((item, index) => ({
      questionId: item.question.id,
      revision: item.question.revision,
      choiceOrder: item.choices.map((choice) => choice.id),
      selected: [...selectionAt(session, index)],
    })),
    cursor: session.cursor,
    stage: session.stage,
  };
}

function permutationOf(question: Question, order: readonly ChoiceId[]): readonly Choice[] | null {
  if (order.length !== question.choices.length || new Set(order).size !== order.length) return null;
  const choices: Choice[] = [];
  for (const id of order) {
    const choice = question.choices.find((candidate) => candidate.id === id);
    if (choice === undefined) return null;
    choices.push(choice);
  }
  return choices;
}

function selectionOf(question: Question, selected: readonly ChoiceId[]): Selection | null {
  const selection = new Set(selected);
  if (selection.size !== selected.length) return null;
  if (question.kind === "single" && selection.size > 1) return null;
  for (const id of selection) {
    if (!question.choices.some((choice) => choice.id === id)) return null;
  }
  return selection;
}

function itemOf(stored: StoredItem, subject: Subject): { item: SessionItem; selection: Selection } | null {
  const question = subject.questions.get(stored.questionId);
  if (question === undefined || question.revision !== stored.revision) return null;
  const choices = permutationOf(question, stored.choiceOrder);
  const selection = selectionOf(question, stored.selected);
  if (choices === null || selection === null) return null;
  return { item: { question, choices }, selection };
}

export function restore(snapshot: SessionSnapshot, subject: Subject): Session | null {
  if (snapshot.subjectId !== subject.id) return null;
  const [firstChapter, ...otherChapters] = snapshot.chapterIds;
  if (firstChapter === undefined || !snapshot.chapterIds.every((id) => subject.chapters.has(id))) return null;
  if (new Set(snapshot.items.map((item) => item.questionId)).size !== snapshot.items.length) return null;
  const restored = [];
  for (const stored of snapshot.items) {
    const entry = itemOf(stored, subject);
    if (entry === null) return null;
    restored.push(entry);
  }
  const [first, ...rest] = restored;
  if (first === undefined) return null;
  const { cursor, stage } = snapshot;
  if (!Number.isInteger(cursor) || cursor < 0 || cursor >= restored.length) return null;
  if (stage.kind === "revealed" && MODES[snapshot.mode].feedback === "deferred") return null;
  return {
    plan: {
      request: {
        subjectId: subject.id,
        chapterIds: [firstChapter, ...otherChapters],
        count: snapshot.count,
        mode: snapshot.mode,
      },
      items: [first.item, ...rest.map((entry) => entry.item)],
      startedAt: snapshot.startedAt,
      deadlineAt: snapshot.deadlineAt,
    },
    selections: restored.map((entry) => entry.selection),
    cursor,
    stage,
  };
}
