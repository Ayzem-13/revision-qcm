import { describe, expect, test } from "bun:test";
import {
  InvalidSubject,
  assembleSubject,
  inspectDrafts,
  subjectId,
  summarise,
  toRichText,
  type ContentIssue,
  type QuestionDraft,
} from "@/domains/catalog/domain";
import { buildSubject, demoSubject, draftChapter, draftQuestion, questionOf } from "../../../support/subjects";

const ch1 = "content/demo/ch1.json";

function expectIssue(issues: readonly ContentIssue[], file: string, fragment: string): void {
  expect(issues).toContainEqual({ file, message: expect.stringContaining(fragment) });
}

function issuesOf(questions: readonly QuestionDraft[]): readonly ContentIssue[] {
  return inspectDrafts([draftChapter("ch1", 1, questions)]);
}

describe("the rules of a valid subject", () => {
  test("a valid chapter has no issue", () => {
    expect(issuesOf([draftQuestion("q1")])).toEqual([]);
  });

  test("an answer position out of range is rejected", () => {
    expectIssue(
      issuesOf([draftQuestion("q1", { correct: [4] })]),
      ch1,
      "q1 : la réponse 4 ne désigne aucun des 4 choix",
    );
  });

  test("a repeated answer position is rejected", () => {
    expectIssue(
      issuesOf([draftQuestion("q1", { kind: "multi", correct: [1, 1] })]),
      ch1,
      "q1 : la réponse 1 est répétée",
    );
  });

  test("a single question with two answers is rejected", () => {
    expectIssue(
      issuesOf([draftQuestion("q1", { correct: [0, 1] })]),
      ch1,
      "q1 : une question « single » attend exactement une réponse, elle en a 2",
    );
  });

  test("a multi question with one answer is rejected", () => {
    expectIssue(
      issuesOf([draftQuestion("q1", { kind: "multi", correct: [2] })]),
      ch1,
      "q1 : une question « multi » attend au moins deux réponses, elle en a 1",
    );
  });

  test("a repeated choice text is rejected", () => {
    expectIssue(
      issuesOf([draftQuestion("q1", { choices: ["ls", "cd", "ls", "pwd"] })]),
      ch1,
      "q1 : le choix « ls » apparaît deux fois",
    );
  });

  test("choices differing only by case are distinct", () => {
    expect(issuesOf([draftQuestion("q1", { choices: ["-m", "-M", "-a", "-A"] })])).toEqual([]);
  });

  test("unbalanced backticks are rejected in the prompt, a choice and the explanation", () => {
    const issues = issuesOf([
      draftQuestion("q1", { prompt: "Que fait `ls ?" }),
      draftQuestion("q2", { choices: ["`a`", "`b", "c", "d"] }),
      draftQuestion("q3", { explanation: "Voir `man." }),
    ]);
    expectIssue(issues, ch1, "q1 : accent grave non refermé dans l'énoncé");
    expectIssue(issues, ch1, "q2 : accent grave non refermé dans le choix 2");
    expectIssue(issues, ch1, "q3 : accent grave non refermé dans l'explication");
  });

  test("backticks inside the code snippet are not checked", () => {
    expect(issuesOf([draftQuestion("q1", { code: "echo `date" })])).toEqual([]);
  });

  test("a question id used in two chapter files is rejected with the second file", () => {
    const issues = inspectDrafts([
      draftChapter("ch1", 1, [draftQuestion("q1")]),
      draftChapter("ch2", 2, [draftQuestion("q1")]),
    ]);
    expectIssue(issues, "content/demo/ch2.json", `question q1 déjà définie dans ${ch1}`);
  });

  test("a chapter id used twice is rejected with the file that repeats it", () => {
    const issues = inspectDrafts([
      draftChapter("ch1", 1, [draftQuestion("q1")]),
      { ...draftChapter("ch1", 2, [draftQuestion("q2")]), origin: "content/demo/copie.json" },
    ]);
    expectIssue(issues, "content/demo/copie.json", `chapitre ch1 déjà défini dans ${ch1}`);
  });

  test("an order used by two chapters is rejected", () => {
    const issues = inspectDrafts([
      draftChapter("ch1", 1, [draftQuestion("q1")]),
      draftChapter("ch2", 1, [draftQuestion("q2")]),
    ]);
    expectIssue(issues, "content/demo/ch2.json", `ordre 1 déjà utilisé par ${ch1}`);
  });

  test("assembleSubject throws every issue at once, not the first one", () => {
    const drafts = [
      draftChapter("ch1", 1, [draftQuestion("q1", { correct: [9] })]),
      draftChapter("ch2", 2, [draftQuestion("q2", { kind: "multi" })]),
    ];
    let caught: unknown = null;
    try {
      assembleSubject(summarise(subjectId("demo"), null, drafts.length), drafts);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(InvalidSubject);
    if (caught instanceof InvalidSubject) {
      expect(caught.issues.map((issue) => issue.file)).toEqual([ch1, "content/demo/ch2.json"]);
    }
  });
});

describe("the shape of a subject", () => {
  test("answers become choice identities that travel with their text", () => {
    const subject = buildSubject([
      draftChapter("ch1", 1, [draftQuestion("q1", { kind: "multi", choices: ["a", "b", "c"], correct: [2, 0] })]),
    ]);
    const question = questionOf(subject, "q1");
    const answered = question.choices.filter((choice) => question.answer.has(choice.id));
    expect(answered.map((choice) => choice.text)).toEqual([
      [{ kind: "text", value: "a" }],
      [{ kind: "text", value: "c" }],
    ]);
    expect(question.code).toBeNull();
    expect(question.kind).toBe("multi");
  });

  test("sections are ordered by their lowest chapter order, chapters by order inside", () => {
    const subject = buildSubject([
      draftChapter("tp-b", 22, [draftQuestion("t2")], "Travaux pratiques"),
      draftChapter("c-2", 5, [draftQuestion("c2")], "Cours"),
      draftChapter("tp-a", 3, [draftQuestion("t1")], "Travaux pratiques"),
      draftChapter("c-1", 4, [draftQuestion("c1")], "Cours"),
    ]);
    expect(subject.sections.map((section) => section.title)).toEqual(["Travaux pratiques", "Cours"]);
    expect(subject.sections.map((section) => section.chapters.map((chapter) => String(chapter.id)))).toEqual([
      ["tp-a", "tp-b"],
      ["c-1", "c-2"],
    ]);
  });

  test("every question knows its chapter and is indexed once", () => {
    const subject = buildSubject([
      draftChapter("ch1", 1, [draftQuestion("q1")]),
      draftChapter("ch2", 2, [draftQuestion("q2"), draftQuestion("q3")]),
    ]);
    expect(String(questionOf(subject, "q2").chapterId)).toBe(String(subject.sections[0]?.chapters[1]?.id));
    expect(subject.questions.size).toBe(3);
    expect(subject.chapters.size).toBe(2);
  });

  test("the summary gives the subject its id, title and hue", () => {
    const subject = assembleSubject(summarise(subjectId("reseaux"), { title: "Réseaux", hue: 150 }, 1), [
      draftChapter("ch1", 1, [draftQuestion("q1")], "Partie 1", "reseaux"),
    ]);
    expect([String(subject.id), subject.title, subject.hue]).toEqual(["reseaux", "Réseaux", 150]);
  });
});

describe("revision", () => {
  const revisionWith = (fields: Partial<Omit<QuestionDraft, "id">>): string =>
    questionOf(buildSubject([draftChapter("ch1", 1, [draftQuestion("q1", fields)])]), "q1").revision;

  test("is stable across assemblies", () => {
    expect(revisionWith({})).toBe(revisionWith({}));
    expect(revisionWith({}).length).toBeGreaterThan(0);
  });

  test("changes when the prompt, the code, a choice or the answer changes", () => {
    const base = revisionWith({});
    expect(revisionWith({ prompt: "Autre énoncé ?" })).not.toBe(base);
    expect(revisionWith({ code: "ls -l" })).not.toBe(base);
    expect(revisionWith({ choices: ["premier", "deuxième", "troisième", "cinquième"] })).not.toBe(base);
    expect(revisionWith({ correct: [2] })).not.toBe(base);
  });

  test("ignores the explanation, the difficulty and the order the answer is written in", () => {
    const base = revisionWith({});
    expect(revisionWith({ explanation: "Une autre explication." })).toBe(base);
    expect(revisionWith({ difficulty: 3 })).toBe(base);
    const multi = revisionWith({ kind: "multi", correct: [0, 2] });
    expect(revisionWith({ kind: "multi", correct: [2, 0] })).toBe(multi);
  });

  test("is computed as the previous build computed it, so stored progress stays current", () => {
    const subject = demoSubject();
    expect([...subject.questions.values()].map((question) => [String(question.id), question.revision])).toEqual([
      ["ch1-q1", "lqw3g28lka"],
      ["ch1-q2", "sibkr4wky3"],
      ["ch1-q3", "h2do6ilyza"],
      ["ch2-q1", "6jcuquwvnd"],
      ["ch2-q2", "39jqp9tvlw"],
    ]);
  });
});

describe("toRichText", () => {
  test("splits text and code", () => {
    expect(toRichText("Utilise `dpkg -l` ici")).toEqual([
      { kind: "text", value: "Utilise " },
      { kind: "code", value: "dpkg -l" },
      { kind: "text", value: " ici" },
    ]);
  });

  test("drops empty segments", () => {
    expect(toRichText("`ls`")).toEqual([{ kind: "code", value: "ls" }]);
    expect(toRichText("a``b")).toEqual([
      { kind: "text", value: "a" },
      { kind: "text", value: "b" },
    ]);
    expect(toRichText("")).toEqual([]);
  });
});

describe("summarise", () => {
  test("a subject without a manifest gets a humanised title and a stable hue", () => {
    const first = summarise(subjectId("admin-linux"), null, 3);
    const second = summarise(subjectId("admin-linux"), null, 3);
    expect(first.title).toBe("Admin linux");
    expect(first.chapterCount).toBe(3);
    expect(first.hue).toBe(second.hue);
    expect(Number.isInteger(first.hue)).toBe(true);
    expect(first.hue).toBeGreaterThanOrEqual(0);
    expect(first.hue).toBeLessThan(360);
    expect(summarise(subjectId("reseaux"), null, 1).hue).not.toBe(first.hue);
  });

  test("the manifest title and hue win", () => {
    expect(summarise(subjectId("admin-linux"), { title: "Administration Linux", hue: 265 }, 2)).toEqual({
      id: subjectId("admin-linux"),
      title: "Administration Linux",
      hue: 265,
      chapterCount: 2,
    });
  });

  test("a manifest without a hue keeps the derived hue", () => {
    const derived = summarise(subjectId("admin-linux"), null, 2).hue;
    expect(summarise(subjectId("admin-linux"), { title: "Administration Linux" }, 2).hue).toBe(derived);
  });
});
