import { z } from "zod";
import { questionId, type QuestionId, type SubjectId } from "@/domains/catalog/domain";
import { EMPTY_PROGRESS, type Progress, type QuestionStat } from "@/domains/progress/domain";
import type { StoreDefinition } from "@/shared/infrastructure";

const storedStat = z.tuple([
  z.number().int().positive(),
  z.number().int().nonnegative(),
  z.union([z.literal(0), z.literal(1)]),
  z.number(),
  z.string().min(1),
]);
const storedProgress = z.record(z.string(), storedStat);

function decodeProgress(data: unknown): Progress {
  return new Map(
    Object.entries(storedProgress.parse(data)).map(
      ([id, [seen, streak, lastCorrect, lastAnsweredAt, revision]]): [QuestionId, QuestionStat] => [
        questionId(id),
        { seen, streak, lastCorrect: lastCorrect === 1, lastAnsweredAt, revision },
      ],
    ),
  );
}

function encodeProgress(progress: Progress): z.input<typeof storedProgress> {
  return Object.fromEntries(
    [...progress].map(([id, stat]): [string, z.input<typeof storedStat>] => [
      id,
      [stat.seen, stat.streak, stat.lastCorrect ? 1 : 0, stat.lastAnsweredAt, stat.revision],
    ]),
  );
}

export function progressShape(subject: SubjectId): StoreDefinition<Progress> {
  return {
    key: `qcm.progress.${subject}`,
    version: 1,
    migrations: {},
    decode: decodeProgress,
    encode: encodeProgress,
    fallback: EMPTY_PROGRESS,
  };
}
