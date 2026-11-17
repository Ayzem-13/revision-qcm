import type { Question } from "@/domains/catalog/domain";
import type { Selection } from "./session";

export function isCorrect(question: Question, selection: Selection): boolean {
  if (selection.size !== question.answer.size) return false;
  for (const id of selection) if (!question.answer.has(id)) return false;
  return selection.size > 0;
}
