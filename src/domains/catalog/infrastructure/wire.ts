import { z } from "zod";
import {
  InvalidSubject,
  assembleSubject,
  inspectDrafts,
  summarise,
  type ChapterDraft,
  type ContentIssue,
  type Subject,
  type SubjectId,
  type SubjectManifest,
  type SubjectSummary,
} from "@/domains/catalog/domain";

const text = z.string().trim().min(1);

const wireQuestion = z.strictObject({
  id: text,
  type: z.enum(["single", "multi"]),
  prompt: text,
  code: z.string().min(1).optional(),
  choices: z.array(text).min(3).max(5),
  answer: z.array(z.number().int().nonnegative()).min(1),
  explanation: text,
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});

export const wireChapter = z.strictObject({
  id: text,
  title: text,
  group: text,
  order: z.number().int(),
  source: text,
  questions: z.array(wireQuestion).min(1),
});

export const wireManifest = z.strictObject({
  title: text,
  hue: z.number().min(0).max(360).optional(),
});

const frenchErrors = z.locales.fr().localeError;

export type WireChapter = z.infer<typeof wireChapter>;

export type RawFile = { readonly path: string; readonly json: unknown };

export type SubjectFiles = {
  readonly id: SubjectId;
  readonly manifest: RawFile | null;
  readonly chapters: readonly RawFile[];
};

export type SubjectReading = {
  readonly summary: SubjectSummary;
  readonly drafts: readonly ChapterDraft[];
  readonly issues: readonly ContentIssue[];
};

function describe(issue: { readonly path: readonly PropertyKey[]; readonly message: string }): string {
  const path = issue.path.map(String).join(".");
  return path === "" ? issue.message : `${path} : ${issue.message}`;
}

export function toDraft(origin: string, chapter: WireChapter): ChapterDraft {
  return {
    origin,
    id: chapter.id,
    title: chapter.title,
    group: chapter.group,
    order: chapter.order,
    source: chapter.source,
    questions: chapter.questions.map((question) => ({
      id: question.id,
      kind: question.type,
      prompt: question.prompt,
      code: question.code,
      choices: question.choices,
      correct: question.answer,
      explanation: question.explanation,
      difficulty: question.difficulty,
    })),
  };
}

export function manifestOf(file: RawFile | null): SubjectManifest | null {
  if (file === null) return null;
  const parsed = wireManifest.safeParse(file.json);
  return parsed.success ? parsed.data : null;
}

export function summaryOf(id: SubjectId, manifest: RawFile | null, chapterCount: number): SubjectSummary {
  return summarise(id, manifestOf(manifest), chapterCount);
}

export function readSubject(files: SubjectFiles): SubjectReading {
  const order = [files.manifest, ...files.chapters].flatMap((file) => (file === null ? [] : [file.path]));
  const schemaIssues: ContentIssue[] = [];
  if (files.manifest !== null) {
    const parsed = wireManifest.safeParse(files.manifest.json, { error: frenchErrors });
    const file = files.manifest.path;
    if (!parsed.success) for (const issue of parsed.error.issues) schemaIssues.push({ file, message: describe(issue) });
  }
  const drafts: ChapterDraft[] = [];
  for (const file of files.chapters) {
    const parsed = wireChapter.safeParse(file.json, { error: frenchErrors });
    if (parsed.success) drafts.push(toDraft(file.path, parsed.data));
    else for (const issue of parsed.error.issues) schemaIssues.push({ file: file.path, message: describe(issue) });
  }
  const issues = [...schemaIssues, ...inspectDrafts(drafts)]
    .map((issue, index) => ({ issue, index, rank: order.indexOf(issue.file) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((entry) => entry.issue);
  return { summary: summaryOf(files.id, files.manifest, files.chapters.length), drafts, issues };
}

export function subjectFrom(files: SubjectFiles): Subject {
  const { summary, drafts, issues } = readSubject(files);
  if (issues.length > 0) throw new InvalidSubject(issues);
  return assembleSubject(summary, drafts);
}
