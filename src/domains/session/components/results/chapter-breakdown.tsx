import type { ReactNode } from "react";
import { Progress } from "@/components/ui/progress";
import type { ChapterScore } from "@/domains/session/application";

function toneOf(ratio: number): "success" | "primary" | "destructive" {
  if (ratio >= 0.8) return "success";
  if (ratio >= 0.5) return "primary";
  return "destructive";
}

export function ChapterBreakdown(props: { scores: readonly ChapterScore[] }): ReactNode {
  return (
    <ul className="flex flex-col gap-4">
      {props.scores.map((score) => {
        const ratio = score.total === 0 ? 0 : score.correct / score.total;
        const percent = Math.round(ratio * 100);
        return (
          <li key={score.chapterId} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-4">
              <span className="min-w-0 text-base">{score.title}</span>
              <span className="shrink-0 text-sm font-semibold text-muted-foreground tabular-nums">
                {score.correct}/{score.total}
                <span className="sr-only"> bonnes réponses, soit </span>
                <span className="ml-2 inline-block min-w-10 text-right text-foreground">{percent} %</span>
              </span>
            </div>
            <Progress value={percent} tone={toneOf(ratio)} aria-label={score.title} aria-valuetext={`${percent} %`} />
          </li>
        );
      })}
    </ul>
  );
}
