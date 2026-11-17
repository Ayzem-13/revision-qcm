import { chapterId, choiceId, questionId, type ChapterId, type ChoiceId, type QuestionId, type SubjectId } from "./ids";

type Span = { readonly kind: "text" | "code"; readonly value: string };
export type RichText = readonly Span[];

export type Choice = { readonly id: ChoiceId; readonly text: RichText };
type AnswerKey = ReadonlySet<ChoiceId>;
export type Difficulty = 1 | 2 | 3;
export type Revision = string;

export type Question = {
  readonly id: QuestionId;
  readonly chapterId: ChapterId;
  readonly kind: "single" | "multi";
  readonly prompt: RichText;
  readonly code: string | null;
  readonly choices: readonly Choice[];
  readonly answer: AnswerKey;
  readonly explanation: RichText;
  readonly difficulty: Difficulty;
  readonly revision: Revision;
};

export type Chapter = {
  readonly id: ChapterId;
  readonly title: string;
  readonly source: string;
  readonly questions: readonly Question[];
};

type Section = { readonly title: string; readonly chapters: readonly Chapter[] };

export type Subject = {
  readonly id: SubjectId;
  readonly title: string;
  readonly hue: number;
  readonly sections: readonly Section[];
  readonly chapters: ReadonlyMap<ChapterId, Chapter>;
  readonly questions: ReadonlyMap<QuestionId, Question>;
};

export type SubjectSummary = {
  readonly id: SubjectId;
  readonly title: string;
  readonly hue: number;
  readonly chapterCount: number;
};

export type SubjectManifest = { readonly title: string; readonly hue?: number };

export type QuestionDraft = {
  readonly id: string;
  readonly kind: "single" | "multi";
  readonly prompt: string;
  readonly code?: string;
  readonly choices: readonly string[];
  readonly correct: readonly number[];
  readonly explanation: string;
  readonly difficulty: Difficulty;
};

export type ChapterDraft = {
  readonly origin: string;
  readonly id: string;
  readonly title: string;
  readonly group: string;
  readonly order: number;
  readonly source: string;
  readonly questions: readonly QuestionDraft[];
};

export type ContentIssue = { readonly file: string; readonly message: string };

export class InvalidSubject extends Error {
  readonly issues: readonly ContentIssue[];
  constructor(issues: readonly ContentIssue[]) {
    super("invalid subject");
    this.issues = issues;
  }
}

const BACKTICK = "`";

function hash53(source: string): number {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let index = 0; index < source.length; index += 1) {
    const unit = source.charCodeAt(index);
    h1 = Math.imul(h1 ^ unit, 2654435761);
    h2 = Math.imul(h2 ^ unit, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

function humanise(folder: string): string {
  const spaced = folder.replaceAll("-", " ").replaceAll("_", " ").trim();
  return spaced.charAt(0).toLocaleUpperCase("fr") + spaced.slice(1);
}

export function summarise(id: SubjectId, manifest: SubjectManifest | null, chapterCount: number): SubjectSummary {
  return {
    id,
    title: manifest?.title ?? humanise(id),
    hue: manifest?.hue ?? hash53(id) % 360,
    chapterCount,
  };
}

function countOf(source: string, unit: string): number {
  return source.split(unit).length - 1;
}

function repeatedIn<T>(values: readonly T[]): ReadonlySet<T> {
  const seen = new Set<T>();
  const repeated = new Set<T>();
  for (const value of values) {
    if (seen.has(value)) repeated.add(value);
    seen.add(value);
  }
  return repeated;
}

function questionProblems(question: QuestionDraft): readonly string[] {
  const problems: string[] = [];
  for (const index of new Set(question.correct)) {
    if (index >= question.choices.length) {
      problems.push(`la réponse ${index} ne désigne aucun des ${question.choices.length} choix`);
    }
  }
  for (const index of repeatedIn(question.correct)) problems.push(`la réponse ${index} est répétée`);
  if (question.kind === "single" && question.correct.length !== 1) {
    problems.push(`une question « single » attend exactement une réponse, elle en a ${question.correct.length}`);
  }
  if (question.kind === "multi" && question.correct.length < 2) {
    problems.push(`une question « multi » attend au moins deux réponses, elle en a ${question.correct.length}`);
  }
  for (const choice of repeatedIn(question.choices)) problems.push(`le choix « ${choice} » apparaît deux fois`);
  const rich: readonly (readonly [string, string])[] = [
    ["l'énoncé", question.prompt],
    ...question.choices.map((choice, index): readonly [string, string] => [`le choix ${index + 1}`, choice]),
    ["l'explication", question.explanation],
  ];
  for (const [field, source] of rich) {
    if (countOf(source, BACKTICK) % 2 !== 0) problems.push(`accent grave non refermé dans ${field}`);
  }
  return problems;
}

function claim<K>(owners: Map<K, string>, key: K, origin: string): string | null {
  const owner = owners.get(key);
  if (owner !== undefined) return owner;
  owners.set(key, origin);
  return null;
}

export function inspectDrafts(drafts: readonly ChapterDraft[]): readonly ContentIssue[] {
  const issues: ContentIssue[] = [];
  const chapterOwners = new Map<string, string>();
  const orderOwners = new Map<number, string>();
  const questionOwners = new Map<string, string>();
  for (const draft of drafts) {
    const report = (message: string): void => {
      issues.push({ file: draft.origin, message });
    };
    const chapterOwner = claim(chapterOwners, draft.id, draft.origin);
    if (chapterOwner !== null) report(`chapitre ${draft.id} déjà défini dans ${chapterOwner}`);
    const orderOwner = claim(orderOwners, draft.order, draft.origin);
    if (orderOwner !== null) report(`ordre ${draft.order} déjà utilisé par ${orderOwner}`);
    for (const question of draft.questions) {
      const questionOwner = claim(questionOwners, question.id, draft.origin);
      if (questionOwner !== null) report(`question ${question.id} déjà définie dans ${questionOwner}`);
      for (const problem of questionProblems(question)) report(`${question.id} : ${problem}`);
    }
  }
  return issues;
}

function revisionOf(question: QuestionDraft): string {
  const answer = [...question.correct].sort((a, b) => a - b);
  return hash53(JSON.stringify([question.prompt, question.code ?? null, question.choices, answer])).toString(36);
}

function toQuestion(draft: QuestionDraft, chapter: ChapterId): Question {
  return {
    id: questionId(draft.id),
    chapterId: chapter,
    kind: draft.kind,
    prompt: toRichText(draft.prompt),
    code: draft.code ?? null,
    choices: draft.choices.map((text, index) => ({ id: choiceId(index), text: toRichText(text) })),
    answer: new Set(draft.correct.map(choiceId)),
    explanation: toRichText(draft.explanation),
    difficulty: draft.difficulty,
    revision: revisionOf(draft),
  };
}

export function assembleSubject(summary: SubjectSummary, drafts: readonly ChapterDraft[]): Subject {
  const issues = inspectDrafts(drafts);
  if (issues.length > 0) throw new InvalidSubject(issues);
  const chapters = new Map<ChapterId, Chapter>();
  const questions = new Map<QuestionId, Question>();
  const groups = new Map<string, Chapter[]>();
  for (const draft of [...drafts].sort((a, b) => a.order - b.order)) {
    const id = chapterId(draft.id);
    const chapter: Chapter = {
      id,
      title: draft.title,
      source: draft.source,
      questions: draft.questions.map((question) => toQuestion(question, id)),
    };
    chapters.set(id, chapter);
    for (const question of chapter.questions) questions.set(question.id, question);
    groups.set(draft.group, [...(groups.get(draft.group) ?? []), chapter]);
  }
  return {
    id: summary.id,
    title: summary.title,
    hue: summary.hue,
    sections: [...groups].map(([title, members]) => ({ title, chapters: members })),
    chapters,
    questions,
  };
}

export function toRichText(source: string): RichText {
  return source
    .split(BACKTICK)
    .flatMap((value, index): Span[] => (value === "" ? [] : [{ kind: index % 2 === 0 ? "text" : "code", value }]));
}
