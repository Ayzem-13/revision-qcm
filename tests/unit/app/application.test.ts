import { describe, expect, test } from "bun:test";
import { createApplication } from "@/app/application";
import type { Question, Subject } from "@/domains/catalog/domain";
import type { QuestionView, ResultsView, Study } from "@/domains/session/application";
import { allChapterIds, demoSubject, editedDemo, questionOf } from "../support/subjects";
import { memoryPorts, MemoryHost, type MemoryPorts } from "../support/memory-ports";

const subject = demoSubject();

async function open(target: Subject = subject, ports: MemoryPorts = memoryPorts({ subjects: [target] })) {
  const application = createApplication(ports);
  const study = await application.study(target.id);
  return { ports, application, study };
}

function questionView(study: Study): QuestionView {
  const view = study.get().session;
  if (view?.kind !== "question") throw new Error(`vue inattendue : ${view?.kind ?? "aucune"}`);
  return view;
}

function resultsView(study: Study): ResultsView {
  const view = study.get().session;
  if (view?.kind !== "results") throw new Error(`vue inattendue : ${view?.kind ?? "aucune"}`);
  return view;
}

function shown(study: Study, target: Subject = subject): Question {
  return questionOf(target, questionView(study).question.id);
}

function answerRight(study: Study): void {
  const question = shown(study);
  for (const choice of question.choices) if (question.answer.has(choice.id)) study.toggle(choice.id);
}

function answerWrong(study: Study): void {
  const question = shown(study);
  const wrong = question.choices.find((choice) => !question.answer.has(choice.id));
  if (wrong === undefined) throw new Error("aucun mauvais choix");
  study.toggle(wrong.id);
}

function seenTotal(ports: MemoryPorts, target: Subject = subject): number {
  return [...ports.progress.of(target).values()].reduce((sum, stat) => sum + stat.seen, 0);
}

describe("a training", () => {
  test("records each verdict once, at its reveal", async () => {
    const { ports, study } = await open();
    study.start({ chapterIds: allChapterIds(subject), count: 2, mode: "training" });
    expect(questionView(study).index).toBe(0);

    answerRight(study);
    study.confirm();
    expect(seenTotal(ports)).toBe(1);
    expect(questionView(study).feedback?.correct).toBe(true);

    study.confirm();
    expect(seenTotal(ports)).toBe(1);
    expect(questionView(study).index).toBe(1);

    answerRight(study);
    study.confirm();
    study.confirm();
    expect(seenTotal(ports)).toBe(2);
    expect(resultsView(study).correct).toBe(2);
    study.confirm();
    expect(seenTotal(ports)).toBe(2);
  });

  test("shows marks only once the answer is revealed", async () => {
    const { study } = await open();
    study.start({ chapterIds: allChapterIds(subject), count: 1, mode: "training" });
    answerWrong(study);
    expect(questionView(study).choices.every((choice) => choice.mark === null)).toBe(true);
    study.confirm();
    expect(questionView(study).choices.some((choice) => choice.mark === "wrong")).toBe(true);
    expect(questionView(study).feedback?.correct).toBe(false);
  });
});

describe("an exam", () => {
  test("records only the answered questions, at the end", async () => {
    const { ports, study } = await open();
    study.start({ chapterIds: allChapterIds(subject), count: 3, mode: "exam" });
    answerRight(study);
    study.goTo(2);
    expect(seenTotal(ports)).toBe(0);
    study.confirm();
    expect(resultsView(study).total).toBe(3);
    expect(seenTotal(ports)).toBe(1);
  });

  test("expires at its deadline on the clock, not before", async () => {
    const { ports, study } = await open();
    study.start({ chapterIds: allChapterIds(subject), count: 2, mode: "exam" });
    const deadline = questionView(study).deadlineAt ?? 0;
    expect(deadline).toBe(1000 + 2 * 60 * 1000);
    ports.clock.set(deadline - 1);
    study.expire();
    expect(questionView(study).index).toBe(0);
    ports.clock.set(deadline + 500);
    study.expire();
    expect(resultsView(study).ending).toBe("timeout");
    expect(resultsView(study).durationMs).toBe(deadline - 1000);
  });
});

describe("starting, replaying and quitting", () => {
  test("quit drops the session and replay draws again with the same setup", async () => {
    const { ports, application, study } = await open();
    study.start({ chapterIds: allChapterIds(subject), count: 2, mode: "exam" });
    const first = ports.host.read("qcm.session");
    study.replay();
    expect(ports.host.read("qcm.session")).not.toBe(first);
    expect(questionView(study).total).toBe(2);
    expect(questionView(study).policy.navigation).toBe("free");
    study.quit();
    expect(study.get().session).toBeNull();
    expect(application.ongoingSubjectId.get()).toBeNull();
  });

  test("asking for every question stores a session that survives a reload", async () => {
    const host = new MemoryHost();
    const { study } = await open(subject, memoryPorts({ subjects: [subject], host }));
    study.start({ chapterIds: allChapterIds(subject), count: Number.POSITIVE_INFINITY, mode: "exam" });
    const reloaded = createApplication(memoryPorts({ subjects: [subject], host }));
    expect(questionView(await reloaded.study(subject.id)).total).toBe(subject.questions.size);
    expect(reloaded.preferences.get().lastCount).toBe(subject.questions.size);
    expect(reloaded.preferences.get().lastMode).toBe("exam");
  });

  test("a start with nothing to draw leaves the current session alone", async () => {
    const { ports, study } = await open();
    study.start({ chapterIds: allChapterIds(subject), count: 2, mode: "training" });
    const before = ports.host.read("qcm.session");
    const state = study.get();
    study.start({ chapterIds: allChapterIds(subject), count: 2, mode: "redo" });
    expect(ports.host.read("qcm.session")).toBe(before);
    expect(study.get()).toBe(state);
  });

  test("a session of another subject is neither shown nor dropped", async () => {
    const other = demoSubject("autre");
    const ports = memoryPorts({ subjects: [subject, other] });
    const application = createApplication(ports);
    (await application.study(other.id)).start({ chapterIds: allChapterIds(other), count: 1, mode: "training" });
    const study = await application.study(subject.id);
    expect(study.get().session).toBeNull();
    study.quit();
    expect(application.ongoingSubjectId.get()).toBe(other.id);
  });

  test("replay with no session does nothing", async () => {
    const { ports, study } = await open();
    study.replay();
    expect(ports.host.read("qcm.session")).toBeNull();
  });
});

describe("content edited since the last visit", () => {
  test("a stored session whose question changed revision is not shown, and is dropped on opening", async () => {
    const host = new MemoryHost();
    const first = await open(subject, memoryPorts({ subjects: [subject], host }));
    first.study.start({ chapterIds: allChapterIds(subject), count: 5, mode: "training" });
    const edited = editedDemo("ch1-q1", { correct: [2] });
    const { application, study } = await open(edited, memoryPorts({ subjects: [edited], host }));
    expect(study.get().session).toBeNull();
    expect(host.read("qcm.session")).toBe(JSON.stringify({ v: 1, data: null }));
    expect(application.ongoingSubjectId.get()).toBeNull();
  });

  test("progress earned on another revision reads as never answered", async () => {
    const host = new MemoryHost();
    const first = await open(subject, memoryPorts({ subjects: [subject], host }));
    first.study.start({ chapterIds: allChapterIds(subject), count: 5, mode: "training" });
    const answered = shown(first.study);
    answerRight(first.study);
    first.study.confirm();
    expect(first.ports.progress.of(subject).get(answered.id)?.seen).toBe(1);
    const edited = editedDemo(answered.id, { prompt: "Énoncé corrigé ?" });
    const second = await open(edited, memoryPorts({ subjects: [edited], host }));
    expect(second.ports.progress.of(edited).get(answered.id)).toBeUndefined();
    expect(second.study.get().overview.mastery).toEqual({ new: 5, missed: 0, learning: 0, mastered: 0 });
  });
});

describe("pool sizes and progress", () => {
  test("poolSizes follows progress, and resetProgress empties it", async () => {
    const { study } = await open();
    expect(study.poolSizes(allChapterIds(subject))).toEqual({ training: 5, exam: 5, redo: 0 });
    study.start({ chapterIds: allChapterIds(subject), count: 1, mode: "training" });
    answerWrong(study);
    study.confirm();
    expect(study.poolSizes(allChapterIds(subject)).redo).toBe(1);
    expect(study.get().overview.mastery.missed).toBe(1);
    study.resetProgress();
    expect(study.poolSizes(allChapterIds(subject)).redo).toBe(0);
    expect(study.get().overview.mastery).toEqual({ new: 5, missed: 0, learning: 0, mastered: 0 });
  });

  test("the overview counts per chapter, per section and for the subject", async () => {
    const { study } = await open();
    const { overview } = study.get();
    expect(overview.title).toBe(subject.title);
    expect(overview.questionCount).toBe(5);
    expect(overview.sections.map((section) => section.chapters.map((chapter) => chapter.questionCount))).toEqual([
      [3, 2],
    ]);
    expect(overview.sections[0]?.chapters[0]?.mastery).toEqual({ new: 3, missed: 0, learning: 0, mastered: 0 });
  });
});

describe("the readable state", () => {
  test("returns the same object while nothing changes, a new one after a change", async () => {
    const { study } = await open();
    const before = study.get();
    expect(study.get()).toBe(before);
    study.start({ chapterIds: allChapterIds(subject), count: 2, mode: "training" });
    const started = study.get();
    expect(started).not.toBe(before);
    expect(study.get()).toBe(started);
  });

  test("an ignored command changes nothing and notifies no one", async () => {
    const { study } = await open();
    study.start({ chapterIds: allChapterIds(subject), count: 2, mode: "training" });
    let calls = 0;
    const unsubscribe = study.subscribe(() => {
      calls += 1;
    });
    const state = study.get();
    study.confirm();
    study.goTo(1);
    expect(study.get()).toBe(state);
    expect(calls).toBe(0);
    unsubscribe();
  });

  test("subscribers hear session and progress changes until they unsubscribe", async () => {
    const { study } = await open();
    let calls = 0;
    const unsubscribe = study.subscribe(() => {
      calls += 1;
    });
    study.start({ chapterIds: allChapterIds(subject), count: 1, mode: "training" });
    const afterStart = calls;
    expect(afterStart).toBeGreaterThan(0);
    study.resetProgress();
    expect(calls).toBe(afterStart + 1);
    unsubscribe();
    study.quit();
    expect(calls).toBe(afterStart + 1);
  });

  test("another tab's write is read on the next get", async () => {
    const { ports, study } = await open();
    study.start({ chapterIds: allChapterIds(subject), count: 1, mode: "training" });
    let heard = 0;
    study.subscribe(() => {
      heard += 1;
    });
    ports.host.fromAnotherTab("qcm.session", JSON.stringify({ v: 1, data: null }));
    expect(heard).toBe(1);
    expect(study.get().session).toBeNull();
  });
});

describe("the application", () => {
  test("lists the subjects and opens each one once", async () => {
    const ports = memoryPorts({ subjects: [subject] });
    const application = createApplication(ports);
    expect(application.subjects.map((summary) => summary.id)).toEqual([subject.id]);
    const first = application.study(subject.id);
    expect(application.study(subject.id)).toBe(first);
    await first;
    expect(ports.subjects.loads()).toBe(1);
  });

  test("a subject that fails to load can be opened again", async () => {
    const ports = memoryPorts({ subjects: [] });
    const application = createApplication(ports);
    await expect(application.study(subject.id)).rejects.toThrow("invalid subject");
    await expect(application.study(subject.id)).rejects.toThrow("invalid subject");
    expect(ports.subjects.loads()).toBe(2);
  });

  test("names the subject of an unfinished session only", async () => {
    const { application, study } = await open();
    expect(application.ongoingSubjectId.get()).toBeNull();
    study.start({ chapterIds: allChapterIds(subject), count: 1, mode: "exam" });
    expect(application.ongoingSubjectId.get()).toBe(subject.id);
    study.confirm();
    expect(application.ongoingSubjectId.get()).toBeNull();
  });

  test("does not name a session whose subject is no longer listed", async () => {
    const host = new MemoryHost();
    const first = await open(subject, memoryPorts({ subjects: [subject], host }));
    first.study.start({ chapterIds: allChapterIds(subject), count: 1, mode: "training" });
    const application = createApplication(memoryPorts({ subjects: [], host }));
    expect(application.ongoingSubjectId.get()).toBeNull();
  });

  test("keeps the theme preference and notifies its subscribers", async () => {
    const { application } = await open();
    expect(application.preferences.get()).toEqual({ theme: "system", lastCount: 20, lastMode: "training" });
    let calls = 0;
    application.preferences.subscribe(() => {
      calls += 1;
    });
    application.preferences.chooseTheme("dark");
    expect(application.preferences.get().theme).toBe("dark");
    expect(calls).toBe(1);
  });
});
