import { useCallback, useState, type ReactNode } from "react";
import { ArrowLeft, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Reveal } from "@/components/ui/motion";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { QuestionView, Study } from "@/domains/session/application";
import {
  ExamTimer,
  QuestionCard,
  QuestionNavigator,
  SessionActionBar,
  SessionDialogs,
  useSessionKeys,
  type PendingConfirmation,
} from "@/domains/session/components";

export function SessionPage(props: { study: Study; view: QuestionView }): ReactNode {
  const { study, view } = props;
  const [pending, setPending] = useState<PendingConfirmation>(null);
  const deferred = view.policy.feedback === "deferred";
  const free = view.policy.navigation === "free";
  const unanswered = view.total - view.answeredCount;
  const needsFinishConfirmation = view.primary.kind === "finish" && deferred && unanswered > 0;

  const primary = useCallback(() => {
    if (!view.primary.enabled) return;
    if (needsFinishConfirmation) setPending("finish");
    else study.confirm();
  }, [needsFinishConfirmation, study, view.primary.enabled]);

  useSessionKeys(view, { toggle: study.toggle, primary, goTo: study.goTo });

  const progress = free ? view.answeredCount : view.index + (view.feedback === null ? 0 : 1);

  return (
    <div className="-mb-8 flex flex-1 flex-col pt-1 md:mb-0">
      <div className="flex items-center gap-1 sm:gap-2">
        <IconAction label="Quitter la session" hint="Quitter" testId="quit" onClick={() => setPending("quit")}>
          <X aria-hidden="true" />
        </IconAction>
        <IconAction
          label="Recommencer la session"
          hint="Recommencer"
          testId="restart"
          onClick={() => setPending("restart")}
        >
          <RotateCcw aria-hidden="true" />
        </IconAction>
        <div className="min-w-0 flex-1 px-1">
          <Progress
            variant="wavy"
            value={progress}
            max={view.total}
            data-testid="session-progress"
            aria-label={free ? "Questions répondues" : "Progression de la session"}
            aria-valuetext={
              free
                ? `${view.answeredCount} répondues sur ${view.total}`
                : `Question ${view.index + 1} sur ${view.total}`
            }
          />
        </div>
        {view.deadlineAt !== null && <ExamTimer deadlineAt={view.deadlineAt} onExpire={study.expire} />}
      </div>

      <div className="mx-auto mt-4 flex w-full max-w-3xl flex-1 flex-col">
        <Reveal key={view.question.id}>
          <QuestionCard view={view} onToggle={study.toggle} />
        </Reveal>

        <p className="mt-6 hidden flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground pointer-fine:flex">
          <span className="flex items-center gap-1">
            <Kbd>1</Kbd> à <Kbd>{view.choices.length}</Kbd> choisir
          </span>
          <span className="flex items-center gap-1">
            <Kbd>Entrée</Kbd> {view.primary.kind === "reveal" ? "valider" : "continuer"}
          </span>
          {free && (
            <span className="flex items-center gap-1">
              <Kbd>←</Kbd> <Kbd>→</Kbd> naviguer
            </span>
          )}
        </p>

        <div className="min-h-6 flex-1" />

        <SessionActionBar
          view={view}
          onPrimary={primary}
          navigation={
            free && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Question précédente"
                  data-testid="previous"
                  disabled={view.index === 0}
                  onClick={() => study.goTo(view.index - 1)}
                >
                  <ArrowLeft aria-hidden="true" />
                </Button>
                <QuestionNavigator answered={view.answered} current={view.index} onGoTo={study.goTo} />
              </>
            )
          }
        />
      </div>

      <SessionDialogs
        pending={pending}
        onPendingChange={setPending}
        deferred={deferred}
        unanswered={unanswered}
        onQuit={study.quit}
        onRestart={study.replay}
        onFinish={study.confirm}
      />
    </div>
  );
}

function IconAction(props: {
  label: string;
  hint: string;
  testId: string;
  onClick: () => void;
  children: ReactNode;
}): ReactNode {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={props.label} data-testid={props.testId} onClick={props.onClick}>
          {props.children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{props.hint}</TooltipContent>
    </Tooltip>
  );
}
