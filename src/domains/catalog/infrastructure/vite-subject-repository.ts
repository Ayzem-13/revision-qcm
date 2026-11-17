import {
  InvalidSubject,
  subjectId,
  type Subject,
  type SubjectRepository,
  type SubjectSummary,
} from "@/domains/catalog/domain";
import { subjectFrom, summaryOf, type RawFile } from "./wire";

export type ContentModules = {
  readonly manifests: Readonly<Record<string, unknown>>;
  readonly chapterLoaders: Readonly<Record<string, () => Promise<unknown>>>;
};

type Entry = {
  readonly summary: SubjectSummary;
  readonly manifest: RawFile | null;
  readonly chapterPaths: readonly string[];
};

const MANIFEST = "subject.json";

function folderOf(path: string): string {
  return path.split("/").at(-2) ?? "";
}

function catalogueOf(modules: ContentModules): readonly Entry[] {
  const folders = new Map<string, string[]>();
  for (const path of Object.keys(modules.chapterLoaders).sort()) {
    const folder = folderOf(path);
    folders.set(folder, [...(folders.get(folder) ?? []), path]);
  }
  return [...folders]
    .map(([folder, chapterPaths]): Entry => {
      const manifestPath = `/content/${folder}/${MANIFEST}`;
      const manifest =
        manifestPath in modules.manifests ? { path: manifestPath, json: modules.manifests[manifestPath] } : null;
      return { summary: summaryOf(subjectId(folder), manifest, chapterPaths.length), manifest, chapterPaths };
    })
    .sort((a, b) => a.summary.title.localeCompare(b.summary.title, "fr"));
}

export function subjectRepositoryOver(modules: ContentModules): SubjectRepository {
  let catalogue: readonly Entry[] | null = null;
  const loading = new Map<string, Promise<Subject>>();
  const entries = (): readonly Entry[] => (catalogue ??= catalogueOf(modules));

  const read = async (entry: Entry): Promise<Subject> => {
    const chapters = await Promise.all(
      entry.chapterPaths.map(async (path) => {
        const load = modules.chapterLoaders[path];
        return { path, json: load === undefined ? undefined : await load() };
      }),
    );
    return subjectFrom({ id: entry.summary.id, manifest: entry.manifest, chapters });
  };

  return {
    list: () => entries().map((entry) => entry.summary),
    load: (id) => {
      const cached = loading.get(id);
      if (cached !== undefined) return cached;
      const entry = entries().find((candidate) => candidate.summary.id === id);
      const promise =
        entry === undefined
          ? Promise.reject(new InvalidSubject([{ file: `content/${id}`, message: "matière introuvable" }]))
          : read(entry);
      loading.set(id, promise);
      promise.catch(() => loading.delete(id));
      return promise;
    },
  };
}

export function viteSubjectRepository(): SubjectRepository {
  return subjectRepositoryOver({
    manifests: import.meta.glob<unknown>("/content/*/subject.json", { eager: true, import: "default" }),
    chapterLoaders: import.meta.glob<unknown>(["/content/*/*.json", "!/content/*/subject.json"], { import: "default" }),
  });
}
