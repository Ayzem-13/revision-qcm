import { describe, expect, test } from "bun:test";
import { InvalidSubject, subjectId } from "@/domains/catalog/domain";
import { subjectRepositoryOver, type ContentModules } from "@/domains/catalog/infrastructure";

function chapter(id: string, order: number, answer: readonly number[] = [1]) {
  return {
    id,
    title: `Chapitre ${id}`,
    group: "Partie 1",
    order,
    source: "cours.pdf",
    questions: [
      {
        id: `${id}-q1`,
        type: "single",
        prompt: "Que fait `ls` ?",
        choices: ["rien", "liste", "efface"],
        answer,
        explanation: "Elle liste.",
        difficulty: 1,
      },
    ],
  };
}

function modules(): ContentModules & { readonly reads: string[] } {
  const reads: string[] = [];
  const loader = (path: string, json: unknown) => async (): Promise<unknown> => {
    reads.push(path);
    return json;
  };
  return {
    reads,
    manifests: { "/content/reseaux/subject.json": { title: "Réseaux", hue: 150 } },
    chapterLoaders: {
      "/content/reseaux/ch01.json": loader("/content/reseaux/ch01.json", chapter("r1", 1)),
      "/content/admin-linux/ch02.json": loader("/content/admin-linux/ch02.json", chapter("a2", 2)),
      "/content/admin-linux/ch01.json": loader("/content/admin-linux/ch01.json", chapter("a1", 1)),
      "/content/casse/ch01.json": loader("/content/casse/ch01.json", chapter("c1", 1, [7])),
    },
  };
}

describe("the subject repository over the content modules", () => {
  test("lists every folder sorted by title, without reading a chapter", () => {
    const content = modules();
    const listed = subjectRepositoryOver(content).list();
    expect(listed).toEqual([
      expect.objectContaining({ id: subjectId("admin-linux"), title: "Admin linux", chapterCount: 2 }),
      expect.objectContaining({ id: subjectId("casse"), title: "Casse", chapterCount: 1 }),
      { id: subjectId("reseaux"), title: "Réseaux", hue: 150, chapterCount: 1 },
    ]);
    expect(content.reads).toEqual([]);
  });

  test("loads a subject from its own files only, once", async () => {
    const content = modules();
    const repository = subjectRepositoryOver(content);
    const subject = await repository.load(subjectId("admin-linux"));
    expect([...subject.chapters.keys()].map(String)).toEqual(["a1", "a2"]);
    expect(subject.title).toBe("Admin linux");
    await repository.load(subjectId("admin-linux"));
    expect(content.reads.toSorted()).toEqual(["/content/admin-linux/ch01.json", "/content/admin-linux/ch02.json"]);
  });

  test("an unknown subject is refused with a French message", async () => {
    await expect(subjectRepositoryOver(modules()).load(subjectId("absente"))).rejects.toEqual(
      new InvalidSubject([{ file: "content/absente", message: "matière introuvable" }]),
    );
  });

  test("an invalid subject is refused with its issues, and read again on the next attempt", async () => {
    const content = modules();
    const repository = subjectRepositoryOver(content);
    let caught: unknown = null;
    await repository.load(subjectId("casse")).catch((error: unknown) => {
      caught = error;
    });
    expect(caught).toBeInstanceOf(InvalidSubject);
    if (caught instanceof InvalidSubject) {
      expect(caught.issues).toEqual([
        { file: "/content/casse/ch01.json", message: "c1-q1 : la réponse 7 ne désigne aucun des 3 choix" },
      ]);
    }
    await repository.load(subjectId("casse")).catch(() => null);
    expect(content.reads.filter((path) => path.includes("casse"))).toHaveLength(2);
  });
});
