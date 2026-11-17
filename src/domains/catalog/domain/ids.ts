declare const brand: unique symbol;
type Brand<T, Name extends string> = T & { readonly [brand]: Name };

export type SubjectId = Brand<string, "SubjectId">;
export type ChapterId = Brand<string, "ChapterId">;
export type QuestionId = Brand<string, "QuestionId">;
export type ChoiceId = Brand<number, "ChoiceId">;

export function subjectId(raw: string): SubjectId {
  return raw as SubjectId;
}

export function chapterId(raw: string): ChapterId {
  return raw as ChapterId;
}

export function questionId(raw: string): QuestionId {
  return raw as QuestionId;
}

export function choiceId(raw: number): ChoiceId {
  return raw as ChoiceId;
}
