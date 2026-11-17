import type { SubjectId } from "./ids";
import type { Subject, SubjectSummary } from "./subject";

export type SubjectRepository = {
  list(): readonly SubjectSummary[];
  load(id: SubjectId): Promise<Subject>;
};
