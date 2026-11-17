import { describe, expect, test } from "bun:test";
import { readSubject, subjectFrom } from "@/domains/catalog/infrastructure/wire";
import { readContentFolders } from "../../../tools/content/files";

const content = await readContentFolders();

describe("the real content", () => {
  test("every file under content/ is readable JSON", () => {
    expect(content.subjects.length).toBeGreaterThan(0);
    expect(content.unreadable).toEqual([]);
  });

  test("every subject folder reads with no issue", () => {
    expect(content.subjects.flatMap((files) => readSubject(files).issues)).toEqual([]);
  });

  test("every chapter file becomes a chapter and every question is indexed once", () => {
    for (const files of content.subjects) {
      const subject = subjectFrom(files);
      expect(subject.chapters.size).toBe(files.chapters.length);
      const inSections = subject.sections.flatMap((section) => section.chapters.flatMap((chapter) => chapter.questions));
      expect(subject.questions.size).toBe(inSections.length);
      expect(subject.questions.size).toBeGreaterThan(0);
    }
  });

  test("every subject has a manifest that names it", () => {
    for (const files of content.subjects) {
      expect(files.manifest).not.toBeNull();
      expect(readSubject(files).summary.title).not.toBe("");
    }
  });
});
