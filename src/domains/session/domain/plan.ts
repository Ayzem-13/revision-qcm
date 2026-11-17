import type { ChapterId, Choice, Question, Subject, SubjectId } from "@/domains/catalog/domain";
import { masteryOf, type Mastery, type Progress, type QuestionStat } from "@/domains/progress/domain";
import { MODES, type Mode } from "./mode";

export type Rng = () => number;

export function seededRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

export type NonEmptyArray<T> = readonly [T, ...T[]];

export type SessionSetup = {
  readonly chapterIds: NonEmptyArray<ChapterId>;
  readonly count: number;
  readonly mode: Mode;
};

export type SessionRequest = SessionSetup & { readonly subjectId: SubjectId };

export type SessionItem = { readonly question: Question; readonly choices: readonly Choice[] };

export type SessionPlan = {
  readonly request: SessionRequest;
  readonly items: NonEmptyArray<SessionItem>;
  readonly startedAt: number;
  readonly deadlineAt: number | null;
};

export const DRAW_WEIGHT: Readonly<Record<Mastery, number>> = { missed: 6, new: 4, learning: 2, mastered: 1 };

const DAY_MS = 24 * 60 * 60 * 1000;
const MASTERED_RECOVERY_DAYS = 7;

export function weightOf(stat: QuestionStat | undefined, now: number): number {
  const mastery = masteryOf(stat);
  const base = DRAW_WEIGHT[mastery];
  if (mastery !== "mastered" || stat === undefined) return base;
  const days = Math.min(Math.max((now - stat.lastAnsweredAt) / DAY_MS, 0), MASTERED_RECOVERY_DAYS);
  return base * (1 + days / MASTERED_RECOVERY_DAYS);
}

export function drawPool(
  subject: Subject,
  progress: Progress,
  chapterIds: readonly ChapterId[],
  mode: Mode,
): readonly Question[] {
  const questions = [...new Set(chapterIds)].flatMap((id) => subject.chapters.get(id)?.questions ?? []);
  if (MODES[mode].pool === "all") return questions;
  return questions.filter((question) => masteryOf(progress.get(question.id)) === "missed");
}

export function shuffle<T>(items: readonly T[], rng: Rng): readonly T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const other = Math.min(Math.floor(rng() * (index + 1)), index);
    const current = copy[index];
    const swapped = copy[other];
    if (current === undefined || swapped === undefined) continue;
    copy[index] = swapped;
    copy[other] = current;
  }
  return copy;
}

export function planSession(
  subject: Subject,
  progress: Progress,
  request: SessionRequest,
  now: number,
  rng: Rng,
): SessionPlan | null {
  if (request.subjectId !== subject.id) return null;
  const pool = drawPool(subject, progress, request.chapterIds, request.mode);
  const wanted = Number.isNaN(request.count) ? 1 : Math.floor(request.count);
  const count = Math.min(Math.max(wanted, 1), pool.length);
  const picked = pool
    .map((question) => ({ question, key: rng() ** (1 / weightOf(progress.get(question.id), now)) }))
    .sort((a, b) => b.key - a.key)
    .slice(0, count)
    .map((entry) => entry.question);
  const [first, ...rest] = shuffle(picked, rng).map((question) => ({
    question,
    choices: shuffle(question.choices, rng),
  }));
  if (first === undefined) return null;
  const seconds = MODES[request.mode].secondsPerQuestion;
  return {
    request: { ...request, count },
    items: [first, ...rest],
    startedAt: now,
    deadlineAt: seconds === null ? null : now + (rest.length + 1) * seconds * 1000,
  };
}
