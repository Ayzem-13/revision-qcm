import type { ReactNode } from "react";
import { AnimatedNumber } from "@/components/ui/motion";
import { ProgressRing } from "@/components/ui/progress-ring";

export function ScoreDial(props: { correct: number; total: number; markOutOf20: number | null }): ReactNode {
  const ratio = props.total === 0 ? 0 : props.correct / props.total;
  const label =
    props.markOutOf20 === null
      ? `${props.correct} bonnes réponses sur ${props.total}`
      : `Note : ${props.markOutOf20.toLocaleString("fr-FR")} sur 20, ${props.correct} bonnes réponses sur ${props.total}`;

  return (
    <figure role="img" aria-label={label} className="m-0" data-testid="score">
      <ProgressRing value={ratio} size="lg">
        <span aria-hidden="true" className="flex flex-col items-center">
          {props.markOutOf20 === null ? (
            <>
              <span className="text-6xl leading-none font-semibold font-stretch-115%">
                <AnimatedNumber value={props.correct} />
              </span>
              <span className="mt-1 text-base font-semibold text-muted-foreground">sur {props.total}</span>
            </>
          ) : (
            <>
              <span className="text-6xl leading-none font-semibold font-stretch-115%">
                <AnimatedNumber value={props.markOutOf20} fractionDigits={1} />
              </span>
              <span className="mt-1 text-base font-semibold text-muted-foreground">/ 20</span>
              <span className="mt-1 text-xs font-semibold text-muted-foreground tabular-nums">
                {props.correct} sur {props.total}
              </span>
            </>
          )}
        </span>
      </ProgressRing>
    </figure>
  );
}
