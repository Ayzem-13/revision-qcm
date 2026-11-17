import {
  assembleSubject,
  subjectId,
  summarise,
  type Chapter,
  type ChapterDraft,
  type ChapterId,
  type Choice,
  type Question,
  type QuestionDraft,
  type Subject,
} from "@/domains/catalog/domain";
import { MODES, type Mode, type NonEmptyArray, type SessionPlan } from "@/domains/session/domain";

export const START = 1000;

export function draftQuestion(id: string, fields: Partial<Omit<QuestionDraft, "id">> = {}): QuestionDraft {
  return {
    id,
    kind: "single",
    prompt: `Énoncé de ${id} ?`,
    choices: ["premier", "deuxième", "troisième", "quatrième"],
    correct: [1],
    explanation: `Explication de ${id}.`,
    difficulty: 1,
    ...fields,
  };
}

export function draftChapter(
  id: string,
  order: number,
  questions: readonly QuestionDraft[],
  group = "Partie 1",
  folder = "demo",
): ChapterDraft {
  return {
    origin: `content/${folder}/${id}.json`,
    id,
    title: `Chapitre ${id}`,
    group,
    order,
    source: "cours.pdf",
    questions,
  };
}

export function buildSubject(drafts: readonly ChapterDraft[], folder = "demo"): Subject {
  return assembleSubject(summarise(subjectId(folder), null, drafts.length), drafts);
}

type QuestionSpec = { readonly id: string } & Partial<Omit<QuestionDraft, "id">>;
export type ChapterSpec = { readonly id: string; readonly order: number; readonly questions: readonly QuestionSpec[] };

export function demoSpec(): ChapterSpec[] {
  return [
    {
      id: "ch1",
      order: 1,
      questions: [{ id: "ch1-q1" }, { id: "ch1-q2", kind: "multi", correct: [0, 2] }, { id: "ch1-q3", correct: [3] }],
    },
    {
      id: "ch2",
      order: 2,
      questions: [
        { id: "ch2-q1", correct: [0] },
        { id: "ch2-q2", kind: "multi", choices: ["a", "b", "c", "d", "e"], correct: [1, 3, 4] },
      ],
    },
  ];
}

export function subjectFromSpec(spec: readonly ChapterSpec[], folder = "demo"): Subject {
  return buildSubject(
    spec.map((chapter) =>
      draftChapter(
        chapter.id,
        chapter.order,
        chapter.questions.map(({ id, ...fields }) => draftQuestion(id, fields)),
        "Partie 1",
        folder,
      ),
    ),
    folder,
  );
}

export function demoSubject(folder = "demo"): Subject {
  return subjectFromSpec(demoSpec(), folder);
}

export function editedDemo(questionId: string, fields: Partial<Omit<QuestionDraft, "id">>): Subject {
  return subjectFromSpec(
    demoSpec().map((chapter) => ({
      ...chapter,
      questions: chapter.questions.map((question) =>
        question.id === questionId ? { ...question, ...fields } : question,
      ),
    })),
  );
}

export function questionOf(subject: Subject, id: string): Question {
  for (const question of subject.questions.values()) {
    if (question.id === id) return question;
  }
  throw new Error(`question ${id} absente`);
}

export function chapterOf(subject: Subject, id: string): Chapter {
  for (const chapter of subject.chapters.values()) {
    if (chapter.id === id) return chapter;
  }
  throw new Error(`chapitre ${id} absent`);
}

export function allChapterIds(subject: Subject): NonEmptyArray<ChapterId> {
  const [first, ...rest] = [...subject.chapters.keys()];
  if (first === undefined) throw new Error("matière vide");
  return [first, ...rest];
}

export function choiceAt(question: Question, index: number): Choice {
  const choice = question.choices[index];
  if (choice === undefined) throw new Error(`choix ${index} absent`);
  return choice;
}

export function correctChoices(question: Question): Choice[] {
  return question.choices.filter((choice) => question.answer.has(choice.id));
}

export function wrongChoice(question: Question): Choice {
  const choice = question.choices.find((candidate) => !question.answer.has(candidate.id));
  if (choice === undefined) throw new Error("aucun mauvais choix");
  return choice;
}

export function planOf(target: Subject, questions: readonly Question[], mode: Mode, startedAt = START): SessionPlan {
  const [first, ...rest] = questions.map((question) => ({ question, choices: question.choices }));
  if (first === undefined) throw new Error("plan vide");
  const seconds = MODES[mode].secondsPerQuestion;
  return {
    request: { subjectId: target.id, chapterIds: [first.question.chapterId], count: questions.length, mode },
    items: [first, ...rest],
    startedAt,
    deadlineAt: seconds === null ? null : startedAt + questions.length * seconds * 1000,
  };
}
