import { describe, expect, test } from "bun:test";
import { storedPreferences } from "@/domains/preferences/infrastructure";
import { settingsShape } from "@/domains/preferences/infrastructure/stored-settings";
import { EMPTY_PROGRESS, record, type Progress } from "@/domains/progress/domain";
import { storedProgressRepository } from "@/domains/progress/infrastructure";
import { progressShape } from "@/domains/progress/infrastructure/stored-progress";
import { begin, handle, snapshotOf } from "@/domains/session/domain";
import { storedSessionRepository } from "@/domains/session/infrastructure";
import { sessionShape } from "@/domains/session/infrastructure/stored-session";
import { createVersionedStore, type StoreDefinition } from "@/shared/infrastructure";
import { MemoryHost } from "../../support/memory-ports";
import { choiceAt, demoSubject, planOf, questionOf } from "../../support/subjects";

const subject = demoSubject();
const q1 = questionOf(subject, "ch1-q1");
const q2 = questionOf(subject, "ch1-q2");
const progressKey = `qcm.progress.${subject.id}`;
const defaults = settingsShape.fallback;

function verdictOn(question: typeof q1, correct: boolean, at: number) {
  return { questionId: question.id, revision: question.revision, correct, at };
}

describe("round trips", () => {
  test("preferences", () => {
    const host = new MemoryHost();
    storedPreferences(host).update((current) => ({ ...current, theme: "dark", lastCount: 40, lastMode: "exam" }));
    expect(storedPreferences(host).get()).toEqual({ theme: "dark", lastCount: 40, lastMode: "exam" });
  });

  test("progress, stored as one tuple per question with its revision", () => {
    const host = new MemoryHost();
    const progress = record(EMPTY_PROGRESS, [verdictOn(q1, true, 10), verdictOn(q2, false, 20)]);
    storedProgressRepository(host).update(subject, () => progress);
    expect(JSON.parse(host.read(progressKey) ?? "null")).toEqual({
      v: 1,
      data: { [q1.id]: [1, 1, 1, 10, q1.revision], [q2.id]: [1, 0, 0, 20, q2.revision] },
    });
    expect(storedProgressRepository(host).of(subject)).toEqual(progress);
  });

  test("a session, and its absence", () => {
    const host = new MemoryHost();
    const session = handle(
      begin(planOf(subject, [q1, q2], "exam")),
      { type: "toggle", choiceId: choiceAt(q1, 2).id },
      1500,
    ).session;
    storedSessionRepository(host).save(session);
    expect(storedSessionRepository(host).of(subject)).toEqual(session);
    expect(JSON.parse(host.read("qcm.session") ?? "null")).toEqual({ v: 1, data: snapshotOf(session) });
    storedSessionRepository(host).discard(subject.id);
    expect(storedSessionRepository(host).of(subject)).toBeNull();
    expect(storedSessionRepository(host).ongoing()).toBeNull();
  });

  test("an empty storage reads as the defaults", () => {
    const host = new MemoryHost();
    expect(storedPreferences(host).get()).toEqual(defaults);
    expect(storedProgressRepository(host).of(subject).size).toBe(0);
    expect(storedSessionRepository(host).of(subject)).toBeNull();
    expect(storedSessionRepository(host).ongoing()).toBeNull();
  });
});

describe("corrupt data", () => {
  test("bad JSON falls back and the raw value is set aside under .corrupt", () => {
    const host = new MemoryHost();
    host.items.set("qcm.settings", "{oups");
    expect(storedPreferences(host).get()).toEqual(defaults);
    expect(host.read("qcm.settings.corrupt")).toBe("{oups");
  });

  test("a value that fails validation is set aside too", () => {
    const host = new MemoryHost();
    const raw = JSON.stringify({ v: 1, data: { theme: "sepia", lastCount: 20, lastMode: "training" } });
    host.items.set("qcm.settings", raw);
    expect(storedPreferences(host).get()).toEqual(defaults);
    expect(host.read("qcm.settings.corrupt")).toBe(raw);
  });

  test("a session with an unknown mode is rejected", () => {
    const snapshot = snapshotOf(begin(planOf(subject, [q1], "training")));
    expect(() => sessionShape.decode({ ...snapshot, mode: "turbo" })).toThrow();
    expect(sessionShape.decode(JSON.parse(JSON.stringify(snapshot)))).toEqual(snapshot);
  });

  test("an earlier set-aside value is not overwritten", () => {
    const host = new MemoryHost();
    host.items.set("qcm.settings.corrupt", "premier");
    host.items.set("qcm.settings", "second");
    storedPreferences(host).get();
    expect(host.read("qcm.settings.corrupt")).toBe("premier");
  });
});

describe("versions", () => {
  test("a newer version is not overwritten, the page keeps working in memory", () => {
    const host = new MemoryHost();
    const raw = JSON.stringify({ v: 2, data: { theme: "light", lastCount: 10, lastMode: "redo", nouveau: true } });
    host.items.set("qcm.settings", raw);
    const store = storedPreferences(host);
    expect(store.get()).toEqual(defaults);
    store.update((current) => ({ ...current, theme: "dark" }));
    expect(host.read("qcm.settings")).toBe(raw);
    expect(store.get().theme).toBe("dark");
    expect(host.read("qcm.settings.corrupt")).toBeNull();
  });

  test("older data runs through every migration up to the current version", () => {
    const host = new MemoryHost();
    const definition: StoreDefinition<string> = {
      key: "essai",
      version: 3,
      migrations: { 1: (older) => `${String(older)}>2`, 2: (older) => `${String(older)}>3` },
      decode: (data) => {
        if (typeof data !== "string") throw new Error("pas une chaîne");
        return data;
      },
      encode: (value) => value,
      fallback: "vide",
    };
    host.items.set("essai", JSON.stringify({ v: 1, data: "v1" }));
    expect(createVersionedStore(definition, host).get()).toBe("v1>2>3");
  });

  test("a missing migration sets the data aside", () => {
    const host = new MemoryHost();
    const definition: StoreDefinition<string> = {
      key: "essai",
      version: 2,
      migrations: {},
      decode: (data) => String(data),
      encode: (value) => value,
      fallback: "vide",
    };
    host.items.set("essai", JSON.stringify({ v: 1, data: "v1" }));
    expect(createVersionedStore(definition, host).get()).toBe("vide");
    expect(host.read("essai.corrupt")).not.toBeNull();
  });

  test("every shape has a migration for each version below its current one", () => {
    const shapes: Pick<StoreDefinition<unknown>, "version" | "migrations">[] = [
      settingsShape,
      sessionShape,
      progressShape(subject.id),
    ];
    for (const shape of shapes) {
      for (let version = 1; version < shape.version; version += 1) {
        expect(typeof shape.migrations[version]).toBe("function");
      }
    }
  });
});

describe("store behaviour", () => {
  test("update applies on top of a value written by another tab in between", () => {
    const host = new MemoryHost();
    const repository = storedProgressRepository(host);
    expect(repository.of(subject).size).toBe(0);
    host.fromAnotherTab(progressKey, JSON.stringify({ v: 1, data: { [q2.id]: [1, 1, 1, 5, q2.revision] } }));
    repository.update(subject, (current: Progress) => record(current, [verdictOn(q1, false, 6)]));
    const after = storedProgressRepository(host).of(subject);
    expect(after.get(q1.id)?.lastCorrect).toBe(false);
    expect(after.get(q2.id)?.lastCorrect).toBe(true);
  });

  test("get returns the same reference while storage is unchanged", () => {
    const host = new MemoryHost();
    const store = storedPreferences(host);
    store.update((current) => ({ ...current, lastCount: 10 }));
    expect(store.get()).toBe(store.get());
  });

  test("listeners hear their own writes and another tab's, until they unsubscribe", () => {
    const host = new MemoryHost();
    const store = storedPreferences(host);
    let calls = 0;
    const unsubscribe = store.subscribe(() => {
      calls += 1;
    });
    store.update((current) => ({ ...current, lastCount: 10 }));
    host.fromAnotherTab(
      "qcm.settings",
      JSON.stringify({ v: 1, data: { theme: "light", lastCount: 5, lastMode: "exam" } }),
    );
    expect(calls).toBe(2);
    expect(store.get().lastCount).toBe(5);
    unsubscribe();
    store.update((current) => ({ ...current, lastCount: 30 }));
    expect(calls).toBe(2);
  });

  test("a failed write keeps the value in memory", () => {
    const host = new MemoryHost();
    host.failWrites = true;
    const store = storedPreferences(host);
    store.update((current) => ({ ...current, lastCount: 12 }));
    expect(store.get().lastCount).toBe(12);
    expect(host.read("qcm.settings")).toBeNull();
  });
});
