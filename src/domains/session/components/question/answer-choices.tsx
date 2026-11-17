import type { ReactNode } from "react";
import { Check, CircleCheck, CircleX, type LucideIcon } from "lucide-react";
import {
  Choice,
  ChoiceContent,
  ChoiceDescription,
  ChoiceGroup,
  ChoiceIndicator,
  ChoiceLabel,
  ChoiceMarker,
} from "@/components/ui/choice-group";
import { Reveal, Stagger } from "@/components/ui/motion";
import type { ChoiceId } from "@/domains/catalog/application";
import { RichText } from "@/domains/catalog/components";
import type { ChoiceMark, ChoiceView } from "@/domains/session/application";

type MarkLook = { readonly verdict: string | null; readonly icon: LucideIcon | null };

const MARKS: Record<ChoiceMark, MarkLook> = {
  correct: { verdict: "Votre réponse, juste", icon: CircleCheck },
  wrong: { verdict: "Votre réponse, fausse", icon: CircleX },
  missed: { verdict: "Bonne réponse, non choisie", icon: CircleCheck },
  neutral: { verdict: null, icon: null },
};

const UNMARKED: MarkLook = { verdict: null, icon: Check };

export function AnswerChoices(props: {
  kind: "single" | "multi";
  choices: readonly ChoiceView[];
  labelledBy: string;
  onToggle: (id: ChoiceId) => void;
}): ReactNode {
  const selected = props.choices.filter((choice) => choice.selected).map((choice) => String(choice.id));
  const locked = props.choices.some((choice) => choice.mark !== null);

  return (
    <ChoiceGroup
      selection={props.kind === "single" ? "single" : "multiple"}
      value={selected}
      locked={locked}
      aria-labelledby={props.labelledBy}
      data-testid="answer-choices"
      onToggle={(value) => {
        const choice = props.choices.find((candidate) => String(candidate.id) === value);
        if (choice !== undefined) props.onToggle(choice.id);
      }}
    >
      <Stagger step="choices" className="flex flex-col gap-2.5">
        {props.choices.map((choice) => {
          const look = choice.mark === null ? UNMARKED : MARKS[choice.mark];
          const Icon = look.icon;
          return (
            <Reveal key={choice.id}>
              <Choice
                value={String(choice.id)}
                tone={choice.mark ?? "default"}
                aria-keyshortcuts={String(choice.key)}
                data-testid={`choice-${choice.key}`}
              >
                <ChoiceMarker>{choice.key}</ChoiceMarker>
                <ChoiceContent>
                  <ChoiceLabel>
                    <RichText value={choice.text} />
                  </ChoiceLabel>
                  {look.verdict !== null && <ChoiceDescription display="hidden">{look.verdict}</ChoiceDescription>}
                </ChoiceContent>
                <ChoiceIndicator>{Icon !== null && <Icon strokeWidth={2.25} />}</ChoiceIndicator>
              </Choice>
            </Reveal>
          );
        })}
      </Stagger>
    </ChoiceGroup>
  );
}
