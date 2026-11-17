import type { Subject, SubjectId } from "@/domains/catalog/domain";
import type { Progress } from "./progress";

export type ProgressRepository = {
  of(subject: Subject): Progress;
  update(subject: Subject, change: (current: Progress) => Progress): void;
  subscribe(subjectId: SubjectId, listener: () => void): () => void;
};
