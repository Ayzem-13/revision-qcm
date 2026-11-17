import type { Subject, SubjectId } from "@/domains/catalog/domain";
import type { Session } from "./session";

type OngoingSession = { readonly subjectId: SubjectId; readonly finished: boolean };

export type SessionRepository = {
  ongoing(): OngoingSession | null;
  of(subject: Subject): Session | null;
  save(session: Session): void;
  discard(subjectId: SubjectId): void;
  subscribe(listener: () => void): () => void;
};
