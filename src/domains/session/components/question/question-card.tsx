import { useId, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "@/components/ui/code";
import type { ChoiceId, Difficulty } from "@/domains/catalog/application";
import { RichText } from "@/domains/catalog/components";
import type { QuestionView } from "@/domains/session/application";
import { AnswerChoices } from "./answer-choices";

const DIFFICULTY: Record<Difficulty, string> = { 1: "Facile", 2: "Moyenne", 3: "Difficile" };

const LEVELS = [1, 2, 3] as const;

export function QuestionCard(props: { view: QuestionView; onToggle: (id: ChoiceId) => void }): ReactNode {
  const { view } = props;
  const promptId = useId();
  const difficulty = view.question.difficulty;

  return (
    <article aria-labelledby={promptId} data-testid="question" className="flex flex-col">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-semibold text-muted-foreground">
        <Badge variant="secondary">
          Question {view.index + 1} sur {view.total}
        </Badge>
        <span className="min-w-0 flex-1 truncate">{view.chapterTitle}</span>
        <span className="flex items-center gap-1.5">
          <span className="sr-only">Difficulté : </span>
          {LEVELS.map((level) => (
            <span
              key={level}
              aria-hidden="true"
              className={level <= difficulty ? "size-2 rounded-full bg-tertiary" : "size-2 rounded-full bg-border"}
            />
          ))}
          <span>{DIFFICULTY[difficulty]}</span>
        </span>
      </div>

      <h2 id={promptId} className="mt-4 text-xl leading-snug font-medium font-stretch-105% sm:text-2xl">
        <RichText value={view.question.prompt} />
      </h2>
      <p className="mt-2 text-sm font-semibold text-primary">
        {view.question.kind === "multi" ? "Plusieurs réponses possibles" : "Une seule réponse"}
      </p>

      {view.question.code !== null && (
        <div className="mt-4">
          <CodeBlock code={view.question.code} />
        </div>
      )}

      <div className="mt-5">
        <AnswerChoices
          kind={view.question.kind}
          choices={view.choices}
          labelledBy={promptId}
          onToggle={props.onToggle}
        />
      </div>
    </article>
  );
}
