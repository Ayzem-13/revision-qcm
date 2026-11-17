import { z } from "zod";
import { chapterId, choiceId, questionId, subjectId } from "@/domains/catalog/domain";
import { isMode, type Mode, type SessionSnapshot } from "@/domains/session/domain";
import type { StoreDefinition } from "@/shared/infrastructure";

const mode = z.custom<Mode>(isMode);

const storedId = z.string().min(1);
const storedChoice = z.number().int().nonnegative().transform(choiceId);

const storedSession = z
  .object({
    subjectId: storedId.transform(subjectId),
    mode,
    chapterIds: z.array(storedId.transform(chapterId)),
    count: z.number().int().positive(),
    startedAt: z.number(),
    deadlineAt: z.number().nullable(),
    items: z.array(
      z.object({
        questionId: storedId.transform(questionId),
        revision: z.string().min(1),
        choiceOrder: z.array(storedChoice),
        selected: z.array(storedChoice),
      }),
    ),
    cursor: z.number().int().nonnegative(),
    stage: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("answering") }),
      z.object({ kind: z.literal("revealed") }),
      z.object({ kind: z.literal("finished"), endedAt: z.number(), ending: z.enum(["completed", "timeout"]) }),
    ]),
  })
  .nullable();

export const sessionShape: StoreDefinition<SessionSnapshot | null> = {
  key: "qcm.session",
  version: 1,
  migrations: {},
  decode: (data) => storedSession.parse(data),
  encode: (value) => value,
  fallback: null,
};
