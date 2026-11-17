import { describe, expect, test } from "bun:test";
import { InvalidSubject, subjectId, type ContentIssue } from "@/domains/catalog/domain";
import {
  manifestOf,
  readSubject,
  subjectFrom,
  toDraft,
  wireChapter,
  type RawFile,
} from "@/domains/catalog/infrastructure/wire";
import { questionOf } from "../../../support/subjects";

type Json = Record<string, unknown>;

function rawQuestion(id: string, fields: Json = {}): Json {
  return {
    id,
    type: "single",
    prompt: `Énoncé de ${id} ?`,
    choices: ["premier", "deuxième", "troisième", "quatrième"],
    answer: [1],
    explanation: `Explication de ${id}.`,
    difficulty: 1,
    ...fields,
  };
}

function rawChapter(id: string, order: number, questions: readonly Json[], group = "Partie 1"): Json {
  return { id, title: `Chapitre ${id}`, group, order, source: "cours.pdf", questions };
}

function fileOf(chapter: Json): RawFile {
  return { path: `content/demo/${String(chapter["id"])}.json`, json: chapter };
}

const manifestPath = "content/demo/subject.json";

function issuesOf(chapters: readonly Json[], manifest?: unknown): readonly ContentIssue[] {
  return readSubject({
    id: subjectId("demo"),
    manifest: manifest === undefined ? null : { path: manifestPath, json: manifest },
    chapters: chapters.map(fileOf),
  }).issues;
}

function expectIssue(issues: readonly ContentIssue[], file: string, fragment: string): void {
  expect(issues).toContainEqual({ file, message: expect.stringContaining(fragment) });
}

const ch1 = "content/demo/ch1.json";

describe("the schema of a chapter file", () => {
  test("a valid file has no issue", () => {
    expect(issuesOf([rawChapter("ch1", 1, [rawQuestion("q1")])])).toEqual([]);
  });

  test("a violation is reported with its path, in French", () => {
    const issues = issuesOf([rawChapter("ch1", 1, [rawQuestion("q1", { choices: ["a", "b"] })])]);
    expectIssue(issues, ch1, "questions.0.choices : ");
    expect(issues.every((issue) => !issue.message.includes("Too small"))).toBe(true);
  });

  test("an unknown field is rejected", () => {
    expectIssue(issuesOf([rawChapter("ch1", 1, [rawQuestion("q1", { indice: "aucun" })])]), ch1, "questions.0");
  });

  test("a file that is not a chapter is rejected as a whole", () => {
    const issues = readSubject({
      id: subjectId("demo"),
      manifest: null,
      chapters: [{ path: ch1, json: undefined }],
    }).issues;
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.every((issue) => issue.file === ch1)).toBe(true);
  });

  test("an invalid file does not hide the rules broken by the others", () => {
    const issues = issuesOf([
      rawChapter("ch1", 1, [rawQuestion("q1", { difficulty: 4 })]),
      rawChapter("ch2", 2, [rawQuestion("q2", { answer: [7] })]),
    ]);
    expectIssue(issues, ch1, "questions.0.difficulty");
    expectIssue(issues, "content/demo/ch2.json", "q2 : la réponse 7 ne désigne aucun des 4 choix");
  });

  test("issues are listed file by file, in the order of the files", () => {
    const issues = issuesOf(
      [
        rawChapter("ch1", 1, [rawQuestion("q1", { answer: [9] })]),
        rawChapter("ch2", 2, [rawQuestion("q2", { type: "triple" })]),
        rawChapter("ch3", 3, [rawQuestion("q3", { answer: [8] })]),
      ],
      { title: "" },
    );
    expect(issues.map((issue) => issue.file)).toEqual([
      manifestPath,
      ch1,
      "content/demo/ch2.json",
      "content/demo/ch3.json",
    ]);
  });
});

describe("from file to draft", () => {
  test("type becomes kind, answer becomes correct, the file becomes the origin", () => {
    const draft = toDraft(
      ch1,
      wireChapter.parse(rawChapter("ch1", 1, [rawQuestion("q1", { type: "multi", answer: [0, 2], code: "ls" })])),
    );
    expect(draft.origin).toBe(ch1);
    expect(draft.questions[0]).toEqual({
      id: "q1",
      kind: "multi",
      prompt: "Énoncé de q1 ?",
      code: "ls",
      choices: ["premier", "deuxième", "troisième", "quatrième"],
      correct: [0, 2],
      explanation: "Explication de q1.",
      difficulty: 1,
    });
  });

  test("surrounding whitespace is trimmed, so a repeated choice is found and the revision ignores it", () => {
    expectIssue(
      issuesOf([rawChapter("ch1", 1, [rawQuestion("q1", { choices: ["ls", "cd", " ls ", "pwd"] })])]),
      ch1,
      "q1 : le choix « ls » apparaît deux fois",
    );
    const revisionWith = (prompt: string): string =>
      questionOf(
        subjectFrom({
          id: subjectId("demo"),
          manifest: null,
          chapters: [fileOf(rawChapter("ch1", 1, [rawQuestion("q1", { prompt })]))],
        }),
        "q1",
      ).revision;
    expect(revisionWith("  Énoncé de q1 ?  ")).toBe(revisionWith("Énoncé de q1 ?"));
  });

  test("subjectFrom throws every issue at once", () => {
    let caught: unknown = null;
    try {
      subjectFrom({
        id: subjectId("demo"),
        manifest: null,
        chapters: [
          rawChapter("ch1", 1, [rawQuestion("q1", { answer: [9] })]),
          rawChapter("ch2", 2, [rawQuestion("q2", { type: "multi" })]),
        ].map(fileOf),
      });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(InvalidSubject);
    if (caught instanceof InvalidSubject)
      expect(caught.issues.map((issue) => issue.file)).toEqual([ch1, "content/demo/ch2.json"]);
  });
});

describe("the manifest", () => {
  test("an invalid manifest is reported against subject.json", () => {
    const issues = issuesOf([rawChapter("ch1", 1, [rawQuestion("q1")])], { title: "", hue: 400 });
    expect(issues.some((issue) => issue.file === manifestPath)).toBe(true);
  });

  test("its title and hue name the subject", () => {
    const reading = readSubject({
      id: subjectId("admin-linux"),
      manifest: { path: manifestPath, json: { title: "Administration Linux", hue: 265 } },
      chapters: [fileOf(rawChapter("ch1", 1, [rawQuestion("q1")]))],
    });
    expect(reading.summary).toEqual({
      id: subjectId("admin-linux"),
      title: "Administration Linux",
      hue: 265,
      chapterCount: 1,
    });
  });

  test("an invalid manifest falls back to derived values", () => {
    expect(manifestOf({ path: manifestPath, json: { title: 3 } })).toBeNull();
    const reading = readSubject({
      id: subjectId("admin-linux"),
      manifest: { path: manifestPath, json: { title: 3 } },
      chapters: [],
    });
    expect(reading.summary.title).toBe("Admin linux");
  });
});
