import { describe, expect, test } from "bun:test";
import { createApplication } from "@/app/application";
import { choiceId, questionId } from "@/domains/catalog/domain";
import { storedPreferences } from "@/domains/preferences/infrastructure";
import { storedProgressRepository } from "@/domains/progress/infrastructure";
import type { QuestionView, ResultsView } from "@/domains/session/application";
import { storedSessionRepository } from "@/domains/session/infrastructure";
import { memoryPorts, MemoryHost } from "../support/memory-ports";
import { demoSubject } from "../support/subjects";

const RAW = {
  settings: `{"v":1,"data":{"theme":"dark","lastCount":40,"lastMode":"exam"}}`,
  progress: `{"v":1,"data":{"ch1-q1":[2,2,1,11,"lqw3g28lka"],"ch1-q2":[1,0,0,20,"sibkr4wky3"]}}`,
  examSession: `{"v":1,"data":{"subjectId":"demo","mode":"exam","chapterIds":["ch1","ch2"],"count":3,"startedAt":1000,"deadlineAt":181000,"items":[{"questionId":"ch1-q3","revision":"h2do6ilyza","choiceOrder":[1,2,0,3],"selected":[0]},{"questionId":"ch2-q1","revision":"6jcuquwvnd","choiceOrder":[2,0,1,3],"selected":[]},{"questionId":"ch1-q1","revision":"lqw3g28lka","choiceOrder":[3,0,1,2],"selected":[]}],"cursor":2,"stage":{"kind":"answering"}}}`,
  revealedTraining: `{"v":1,"data":{"subjectId":"demo","mode":"training","chapterIds":["ch2"],"count":2,"startedAt":5000,"deadlineAt":null,"items":[{"questionId":"ch2-q2","revision":"39jqp9tvlw","choiceOrder":[0,1,2,3,4],"selected":[1,3]},{"questionId":"ch1-q1","revision":"lqw3g28lka","choiceOrder":[0,1,2,3],"selected":[]}],"cursor":0,"stage":{"kind":"revealed"}}}`,
  finishedTraining: `{"v":1,"data":{"subjectId":"demo","mode":"training","chapterIds":["ch2"],"count":2,"startedAt":5000,"deadlineAt":null,"items":[{"questionId":"ch2-q2","revision":"39jqp9tvlw","choiceOrder":[0,1,2,3,4],"selected":[1,3]},{"questionId":"ch1-q1","revision":"lqw3g28lka","choiceOrder":[0,1,2,3],"selected":[0]}],"cursor":1,"stage":{"kind":"finished","endedAt":5700,"ending":"completed"}}}`,
};

const subject = demoSubject();

function hostWith(entries: Readonly<Record<string, string>>): MemoryHost {
  const host = new MemoryHost();
  for (const [key, raw] of Object.entries(entries)) host.items.set(key, raw);
  return host;
}

async function stateFrom(raw: string) {
  const host = hostWith({ "qcm.session": raw });
  const application = createApplication(memoryPorts({ subjects: [subject], host }));
  const study = await application.study(subject.id);
  return { host, application, view: study.get().session };
}

describe("data written by the previous build", () => {
  test("the preferences read unchanged", () => {
    expect(storedPreferences(hostWith({ "qcm.settings": RAW.settings })).get()).toEqual({
      theme: "dark",
      lastCount: 40,
      lastMode: "exam",
      lastChapters: {},
    });
  });

  test("the progress reads unchanged and its revisions are still current", () => {
    const progress = storedProgressRepository(hostWith({ "qcm.progress.demo": RAW.progress })).of(subject);
    expect([...progress]).toEqual([
      [questionId("ch1-q1"), { seen: 2, streak: 2, lastCorrect: true, lastAnsweredAt: 11, revision: "lqw3g28lka" }],
      [questionId("ch1-q2"), { seen: 1, streak: 0, lastCorrect: false, lastAnsweredAt: 20, revision: "sibkr4wky3" }],
    ]);
  });

  test("an exam in progress resumes where it was left, with its shuffled choices and answer", async () => {
    const { host, application, view } = await stateFrom(RAW.examSession);
    expect(view?.kind).toBe("question");
    const question: QuestionView | null = view?.kind === "question" ? view : null;
    expect(question?.index).toBe(2);
    expect(question?.question.id).toBe(questionId("ch1-q1"));
    expect(question?.choices.map((choice) => choice.id)).toEqual([3, 0, 1, 2].map(choiceId));
    expect(question?.answered).toEqual([true, false, false]);
    expect(question?.deadlineAt).toBe(181000);
    expect(application.ongoingSubjectId.get()).toBe(subject.id);
    expect(host.read("qcm.session")).toBe(RAW.examSession);
  });

  test("a revealed training question shows its marks again", async () => {
    const { view } = await stateFrom(RAW.revealedTraining);
    const question: QuestionView | null = view?.kind === "question" ? view : null;
    expect(question?.choices.map((choice) => choice.mark)).toEqual([
      "neutral",
      "correct",
      "neutral",
      "correct",
      "missed",
    ]);
    expect(question?.feedback?.correct).toBe(false);
    expect(question?.primary).toEqual({ kind: "next", enabled: true });
  });

  test("a finished training shows its results and is not offered for resuming", async () => {
    const { application, view } = await stateFrom(RAW.finishedTraining);
    const results: ResultsView | null = view?.kind === "results" ? view : null;
    expect(results?.total).toBe(2);
    expect(results?.correct).toBe(0);
    expect(results?.durationMs).toBe(700);
    expect(results?.reviewed.map((reviewed) => reviewed.outcome)).toEqual(["wrong", "wrong"]);
    expect(application.ongoingSubjectId.get()).toBeNull();
  });

  test("the repository restores the same session the snapshot describes", () => {
    const session = storedSessionRepository(hostWith({ "qcm.session": RAW.examSession })).of(subject);
    expect<unknown>(session?.plan.request).toEqual({
      subjectId: subject.id,
      chapterIds: [...subject.chapters.keys()],
      count: 3,
      mode: "exam",
    });
    expect(session?.selections.map((selection) => [...selection])).toEqual([[choiceId(0)], [], []]);
  });

  test("writing again keeps the same keys and shapes, plus the chapters of the last setup", async () => {
    const host = hostWith({
      "qcm.session": RAW.examSession,
      "qcm.progress.demo": RAW.progress,
      "qcm.settings": RAW.settings,
    });
    const application = createApplication(memoryPorts({ subjects: [subject], host }));
    const study = await application.study(subject.id);
    study.goTo(0);
    study.goTo(2);
    expect(host.read("qcm.session")).toBe(RAW.examSession);
    application.preferences.chooseTheme("dark");
    expect(host.read("qcm.settings")).toBe(
      `{"v":1,"data":{"theme":"dark","lastCount":40,"lastMode":"exam","lastChapters":{}}}`,
    );
    study.resetProgress();
    expect(host.read("qcm.progress.demo")).toBe(`{"v":1,"data":{}}`);
  });
});
