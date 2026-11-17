import { useState, type ReactNode } from "react";
import { ArrowRight, Check, CircleCheck, CircleX, Flag } from "lucide-react";
import {
  ActionBar,
  ActionBarPanel,
  ActionBarPanelTrigger,
  ActionBarPrimary,
  ActionBarRow,
  ActionBarStatus,
} from "@/components/ui/action-bar";
import { Button } from "@/components/ui/button";
import type { QuestionId } from "@/domains/catalog/application";
import { RichText } from "@/domains/catalog/components";
import type { PrimaryAction, QuestionView } from "@/domains/session/application";

const PRIMARY_LABEL: Record<PrimaryAction["kind"], Record<"immediate" | "deferred", string>> = {
  reveal: { immediate: "Valider", deferred: "Valider" },
  next: { immediate: "Continuer", deferred: "Suivante" },
  finish: { immediate: "Voir les résultats", deferred: "Terminer l'examen" },
};

const PRIMARY_ICON = { reveal: Check, next: ArrowRight, finish: Flag } as const;

export function SessionActionBar(props: {
  view: QuestionView;
  onPrimary: () => void;
  navigation: ReactNode;
}): ReactNode {
  const { view } = props;
  const [foldedFor, setFoldedFor] = useState<QuestionId | null>(null);
  const feedback = view.feedback;
  const open = feedback !== null && foldedFor !== view.question.id;
  const Icon = PRIMARY_ICON[view.primary.kind];
  const VerdictIcon = feedback?.correct === true ? CircleCheck : CircleX;
  const verdict = feedback === null ? null : feedback.correct ? "Bonne réponse" : "Réponse incorrecte";

  return (
    <ActionBar
      placement="sticky"
      open={open}
      onOpenChange={(next) => setFoldedFor(next ? null : view.question.id)}
      data-testid="action-bar"
    >
      {feedback !== null && (
        <ActionBarPanel tone={feedback.correct ? "success" : "destructive"} aria-label="Correction">
          <p className="flex items-center gap-2 text-lg font-medium">
            <VerdictIcon
              aria-hidden="true"
              className={feedback.correct ? "size-6 shrink-0 text-success" : "size-6 shrink-0 text-destructive"}
            />
            {verdict}
          </p>
          {feedback.explanation.length > 0 && (
            <p className="text-base">
              <RichText value={feedback.explanation} />
            </p>
          )}
        </ActionBarPanel>
      )}
      <ActionBarRow>
        <ActionBarStatus>
          {props.navigation}
          {verdict === null ? (
            !view.primary.enabled && (
              <span className="hidden truncate sm:block">
                {view.question.kind === "multi" ? "Cochez une ou plusieurs réponses" : "Choisissez une réponse"}
              </span>
            )
          ) : (
            <ActionBarPanelTrigger data-testid="correction-toggle">
              <VerdictIcon
                aria-hidden="true"
                className={feedback?.correct === true ? "text-success" : "text-destructive"}
              />
              <span className="truncate">Explication</span>
            </ActionBarPanelTrigger>
          )}
          <span className="sr-only" aria-live="polite">
            {verdict ?? ""}
          </span>
        </ActionBarStatus>
        <ActionBarPrimary>
          <Button
            size="lg"
            disabled={!view.primary.enabled}
            onClick={props.onPrimary}
            aria-keyshortcuts="Enter"
            data-testid="primary-action"
          >
            {PRIMARY_LABEL[view.primary.kind][view.policy.feedback]}
            <Icon aria-hidden="true" />
          </Button>
        </ActionBarPrimary>
      </ActionBarRow>
    </ActionBar>
  );
}
