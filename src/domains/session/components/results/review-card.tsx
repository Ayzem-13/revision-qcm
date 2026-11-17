import type { ReactNode } from "react";
import { CircleCheck, CircleMinus, CircleX, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CodeBlock } from "@/components/ui/code";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemMedia } from "@/components/ui/item";
import { RichText } from "@/domains/catalog/components";
import type { ChoiceMark, ReviewedQuestion } from "@/domains/session/application";

const OUTCOME = {
  correct: { label: "Juste", icon: CircleCheck, badge: "success" },
  wrong: { label: "Faux", icon: CircleX, badge: "destructive" },
  unanswered: { label: "Sans réponse", icon: CircleMinus, badge: "muted" },
} as const;

const LINE: Record<ChoiceMark, { readonly note: string | null; readonly icon: LucideIcon | null }> = {
  correct: { note: "Votre réponse, juste", icon: CircleCheck },
  wrong: { note: "Votre réponse, fausse", icon: CircleX },
  missed: { note: "Bonne réponse", icon: CircleCheck },
  neutral: { note: null, icon: null },
};

export function ReviewCard(props: { reviewed: ReviewedQuestion }): ReactNode {
  const { reviewed } = props;
  const outcome = OUTCOME[reviewed.outcome];
  const OutcomeIcon = outcome.icon;

  return (
    <Card asChild>
      <article aria-labelledby={`review-${reviewed.number}`}>
        <CardHeader className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold text-muted-foreground">Question {reviewed.number}</span>
          <Badge variant={outcome.badge}>
            <OutcomeIcon aria-hidden="true" />
            {outcome.label}
          </Badge>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <h3 id={`review-${reviewed.number}`} className="text-lg leading-snug font-medium">
            <RichText value={reviewed.prompt} />
          </h3>
          {reviewed.code !== null && <CodeBlock code={reviewed.code} />}
          <ItemGroup className="gap-1.5">
            {reviewed.choices.map((choice) => {
              const line = LINE[choice.mark];
              const Icon = line.icon;
              return (
                <Item key={choice.id} role="listitem" variant={choice.mark}>
                  <ItemMedia variant="icon">
                    {Icon === null ? <span className="size-5" /> : <Icon aria-hidden="true" />}
                  </ItemMedia>
                  <ItemContent className="min-w-0 gap-0.5">
                    <span className="wrap-break-word">
                      <RichText value={choice.text} />
                    </span>
                    {line.note !== null && <ItemDescription>{line.note}</ItemDescription>}
                  </ItemContent>
                </Item>
              );
            })}
          </ItemGroup>
          {reviewed.explanation.length > 0 && (
            <p className="border-t pt-4 text-base text-muted-foreground">
              <RichText value={reviewed.explanation} />
            </p>
          )}
        </CardContent>
      </article>
    </Card>
  );
}
