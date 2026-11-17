import { describe, expect, test } from "bun:test";
import { record } from "@/domains/progress/domain";
import { storedProgressRepository } from "@/domains/progress/infrastructure";
import { MemoryHost } from "../../../support/memory-ports";
import { demoSubject, questionOf } from "../../../support/subjects";

const subject = demoSubject();
const q1 = questionOf(subject, "ch1-q1");
const q2 = questionOf(subject, "ch1-q2");
const progressKey = `qcm.progress.${subject.id}`;

function verdictOn(question: typeof q1, correct: boolean, at: number) {
  return { questionId: question.id, revision: question.revision, correct, at };
}

describe("the progress repository", () => {
  test("keeps one store per subject: a subject's listeners do not hear another subject", () => {
    const host = new MemoryHost();
    const other = demoSubject("autre");
    const repository = storedProgressRepository(host);
    let calls = 0;
    repository.subscribe(subject.id, () => {
      calls += 1;
    });
    repository.update(other, (current) => record(current, [verdictOn(q1, true, 1)]));
    expect(calls).toBe(0);
    expect(repository.of(subject).size).toBe(0);
    expect(host.read("qcm.progress.autre")).not.toBeNull();
    repository.update(subject, (current) => record(current, [verdictOn(q1, true, 1)]));
    expect(calls).toBe(1);
  });

  test("of returns the same map while storage is unchanged, stale stats already dropped", () => {
    const host = new MemoryHost();
    host.items.set(
      progressKey,
      JSON.stringify({ v: 1, data: { [q1.id]: [1, 1, 1, 5, "ancienne"], [q2.id]: [1, 1, 1, 5, q2.revision] } }),
    );
    const repository = storedProgressRepository(host);
    const current = repository.of(subject);
    expect(repository.of(subject)).toBe(current);
    expect(current.has(q1.id)).toBe(false);
    expect(current.has(q2.id)).toBe(true);
  });

  test("recording drops the stale stats from storage", () => {
    const host = new MemoryHost();
    host.items.set(progressKey, JSON.stringify({ v: 1, data: { [q1.id]: [3, 3, 1, 5, "ancienne"] } }));
    storedProgressRepository(host).update(subject, (current) => record(current, [verdictOn(q1, true, 9)]));
    expect(JSON.parse(host.read(progressKey) ?? "null")).toEqual({
      v: 1,
      data: { [q1.id]: [1, 1, 1, 9, q1.revision] },
    });
  });
});
