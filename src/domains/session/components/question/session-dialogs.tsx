import type { ReactNode } from "react";
import { ConfirmDialog } from "@/shared/components";

export type PendingConfirmation = "quit" | "restart" | "finish" | null;

export function SessionDialogs(props: {
  pending: PendingConfirmation;
  onPendingChange: (pending: PendingConfirmation) => void;
  deferred: boolean;
  unanswered: number;
  onQuit: () => void;
  onRestart: () => void;
  onFinish: () => void;
}): ReactNode {
  const closeUnless = (kind: Exclude<PendingConfirmation, null>) => (open: boolean) =>
    props.onPendingChange(open ? kind : null);

  return (
    <>
      <ConfirmDialog
        open={props.pending === "finish"}
        onOpenChange={closeUnless("finish")}
        title="Terminer l'examen ?"
        description={
          props.unanswered > 1
            ? `${props.unanswered} questions sont encore sans réponse. Elles compteront comme fausses.`
            : "Une question est encore sans réponse. Elle comptera comme fausse."
        }
        cancel="Continuer l'examen"
        confirm="Terminer"
        onConfirm={props.onFinish}
      />
      <ConfirmDialog
        open={props.pending === "restart"}
        onOpenChange={closeUnless("restart")}
        title="Recommencer la session ?"
        description={
          props.deferred
            ? "Un nouvel examen démarre avec un autre tirage. Celui-ci est abandonné, sans note."
            : "Une nouvelle session démarre avec un autre tirage. Les réponses déjà corrigées restent enregistrées."
        }
        cancel="Annuler"
        confirm="Recommencer"
        onConfirm={props.onRestart}
      />
      <ConfirmDialog
        open={props.pending === "quit"}
        onOpenChange={closeUnless("quit")}
        title="Quitter la session ?"
        description={
          props.deferred
            ? "L'examen sera abandonné, sans note ni enregistrement."
            : "Les réponses déjà corrigées restent enregistrées dans votre progression."
        }
        cancel="Rester"
        confirm="Quitter"
        tone="destructive"
        onConfirm={props.onQuit}
      />
    </>
  );
}
