import type { Subject, SubjectId } from "@/domains/catalog/domain";
import { currentFor, type Progress, type ProgressRepository } from "@/domains/progress/domain";
import { createVersionedStore, type StorageHost, type VersionedStore } from "@/shared/infrastructure";
import { progressShape } from "./stored-progress";

type Current = { readonly stored: Progress; readonly subject: Subject; readonly progress: Progress };

export function storedProgressRepository(host: StorageHost): ProgressRepository {
  const stores = new Map<SubjectId, VersionedStore<Progress>>();
  const current = new Map<SubjectId, Current>();

  const storeOf = (subjectId: SubjectId): VersionedStore<Progress> => {
    const existing = stores.get(subjectId);
    if (existing !== undefined) return existing;
    const created = createVersionedStore(progressShape(subjectId), host);
    stores.set(subjectId, created);
    return created;
  };

  return {
    of: (subject) => {
      const stored = storeOf(subject.id).get();
      const cached = current.get(subject.id);
      if (cached !== undefined && cached.stored === stored && cached.subject === subject) return cached.progress;
      const progress = currentFor(stored, subject);
      current.set(subject.id, { stored, subject, progress });
      return progress;
    },
    update: (subject, change) => storeOf(subject.id).update((stored) => change(currentFor(stored, subject))),
    subscribe: (subjectId, listener) => storeOf(subjectId).subscribe(listener),
  };
}
