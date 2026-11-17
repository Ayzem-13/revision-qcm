import { describe, expect, test } from "bun:test";
import { begin, handle } from "@/domains/session/domain";
import { storedSessionRepository } from "@/domains/session/infrastructure";
import { MemoryHost } from "../../../support/memory-ports";
import { demoSubject, editedDemo, planOf, questionOf } from "../../../support/subjects";

const subject = demoSubject();
const q1 = questionOf(subject, "ch1-q1");
const q2 = questionOf(subject, "ch1-q2");

describe("the session repository", () => {
  test("of returns the same session while storage is unchanged", () => {
    const host = new MemoryHost();
    const repository = storedSessionRepository(host);
    repository.save(begin(planOf(subject, [q1, q2], "training")));
    const session = repository.of(subject);
    expect(session).not.toBeNull();
    expect(repository.of(subject)).toBe(session);
  });

  test("a session of another subject is neither restored nor discarded", () => {
    const host = new MemoryHost();
    const other = demoSubject("autre");
    const repository = storedSessionRepository(host);
    repository.save(begin(planOf(other, [questionOf(other, "ch1-q1")], "training")));
    const raw = host.read("qcm.session");
    expect(repository.of(subject)).toBeNull();
    repository.discard(subject.id);
    expect(host.read("qcm.session")).toBe(raw);
    expect(repository.ongoing()).toEqual({ subjectId: other.id, finished: false });
  });

  test("a session the content no longer matches restores as null, but is still ongoing until discarded", () => {
    const host = new MemoryHost();
    const repository = storedSessionRepository(host);
    repository.save(begin(planOf(subject, [q1], "training")));
    expect(repository.of(editedDemo("ch1-q1", { correct: [2] }))).toBeNull();
    expect(repository.ongoing()).toEqual({ subjectId: subject.id, finished: false });
  });

  test("ongoing reports a finished session as finished", () => {
    const host = new MemoryHost();
    const repository = storedSessionRepository(host);
    const finished = handle(begin(planOf(subject, [q1], "exam")), { type: "confirm" }, 2000).session;
    repository.save(finished);
    expect(repository.ongoing()).toEqual({ subjectId: subject.id, finished: true });
  });
});
