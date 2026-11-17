import { join } from "node:path";
import { subjectId, type ContentIssue } from "@/domains/catalog/domain";
import type { RawFile, SubjectFiles } from "@/domains/catalog/infrastructure/wire";

export type ContentFolders = {
  readonly subjects: readonly SubjectFiles[];
  readonly unreadable: readonly ContentIssue[];
};

const MANIFEST = "subject.json";

export const PROJECT_ROOT = join(import.meta.dir, "..", "..");

export async function readContentFolders(root: string = PROJECT_ROOT): Promise<ContentFolders> {
  const paths: string[] = [];
  for await (const found of new Bun.Glob("content/*/*.json").scan({ cwd: root, onlyFiles: true })) {
    paths.push(found.replaceAll("\\", "/"));
  }
  const folders = new Map<string, { manifest: RawFile | null; chapters: RawFile[] }>();
  const unreadable: ContentIssue[] = [];
  for (const path of paths.sort()) {
    const [, folder = "", name = ""] = path.split("/");
    const entry = folders.get(folder) ?? { manifest: null, chapters: [] };
    folders.set(folder, entry);
    let json: unknown;
    try {
      json = JSON.parse(await Bun.file(join(root, path)).text());
    } catch (error) {
      unreadable.push({
        file: path,
        message: `JSON illisible : ${error instanceof Error ? error.message : String(error)}`,
      });
      continue;
    }
    if (name === MANIFEST) entry.manifest = { path, json };
    else entry.chapters.push({ path, json });
  }
  return {
    subjects: [...folders].map(([folder, entry]) => ({ id: subjectId(folder), ...entry })),
    unreadable,
  };
}
