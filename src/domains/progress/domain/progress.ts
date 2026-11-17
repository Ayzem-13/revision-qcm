import type { Question, QuestionId, Revision, Subject } from "@/domains/catalog/domain";

export type QuestionStat = {
  readonly seen: number;
  readonly streak: number;
  readonly lastCorrect: boolean;
  readonly lastAnsweredAt: number;
  readonly revision: Revision;
};

export type Progress = ReadonlyMap<QuestionId, QuestionStat>;

export const EMPTY_PROGRESS: Progress = new Map();

export type Mastery = "new" | "missed" | "learning" | "mastered";
export type MasteryCounts = Readonly<Record<Mastery, number>>;

const MASTERED_STREAK = 2;

export type Verdict = {
  readonly questionId: QuestionId;
  readonly revision: Revision;
  readonly correct: boolean;
  readonly at: number;
};

export function masteryOf(stat: QuestionStat | undefined): Mastery {
  if (stat === undefined) return "new";
  if (!stat.lastCorrect) return "missed";
  return stat.streak >= MASTERED_STREAK ? "mastered" : "learning";
}

export function record(progress: Progress, verdicts: readonly Verdict[]): Progress {
  const next = new Map(progress);
  for (const verdict of verdicts) {
    const previous = next.get(verdict.questionId);
    next.set(verdict.questionId, {
      seen: (previous?.seen ?? 0) + 1,
      streak: verdict.correct ? (previous?.streak ?? 0) + 1 : 0,
      lastCorrect: verdict.correct,
      lastAnsweredAt: verdict.at,
      revision: verdict.revision,
    });
  }
  return next;
}

export function currentFor(stored: Progress, subject: Subject): Progress {
  const stale = [...stored].filter(([id, stat]) => {
    const question = subject.questions.get(id);
    return question !== undefined && question.revision !== stat.revision;
  });
  if (stale.length === 0) return stored;
  const current = new Map(stored);
  for (const [id] of stale) current.delete(id);
  return current;
}

export function masteryIn(questions: readonly Question[], progress: Progress): MasteryCounts {
  const counts: Record<Mastery, number> = { new: 0, missed: 0, learning: 0, mastered: 0 };
  for (const question of questions) counts[masteryOf(progress.get(question.id))] += 1;
  return counts;
}

export function addCounts(a: MasteryCounts, b: MasteryCounts): MasteryCounts {
  return {
    new: a.new + b.new,
    missed: a.missed + b.missed,
    learning: a.learning + b.learning,
    mastered: a.mastered + b.mastered,
  };
}
