import type { Subject } from "@/domains/catalog/domain";
import {
  restore,
  snapshotOf,
  type Session,
  type SessionRepository,
  type SessionSnapshot,
} from "@/domains/session/domain";
import { createVersionedStore, type StorageHost } from "@/shared/infrastructure";
import { sessionShape } from "./stored-session";

type Restored = { readonly snapshot: SessionSnapshot; readonly subject: Subject; readonly session: Session | null };

export function storedSessionRepository(host: StorageHost): SessionRepository {
  const store = createVersionedStore(sessionShape, host);
  let restored: Restored | null = null;

  return {
    ongoing: () => {
      const snapshot = store.get();
      return snapshot === null ? null : { subjectId: snapshot.subjectId, finished: snapshot.stage.kind === "finished" };
    },
    of: (subject) => {
      const snapshot = store.get();
      if (snapshot === null || snapshot.subjectId !== subject.id) return null;
      if (restored === null || restored.snapshot !== snapshot || restored.subject !== subject) {
        restored = { snapshot, subject, session: restore(snapshot, subject) };
      }
      return restored.session;
    },
    save: (session) => store.update(() => snapshotOf(session)),
    discard: (subjectId) => {
      if (store.get()?.subjectId === subjectId) store.update(() => null);
    },
    subscribe: store.subscribe,
  };
}
