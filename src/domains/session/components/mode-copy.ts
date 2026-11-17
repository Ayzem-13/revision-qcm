import { BookOpenCheck, RotateCcw, Timer, type LucideIcon } from "lucide-react";
import type { Mode } from "@/domains/session/application";

export const MODE_COPY: Record<
  Mode,
  { readonly label: string; readonly description: string; readonly icon: LucideIcon }
> = {
  training: {
    label: "Entraînement",
    description: "Correction et explication après chaque réponse.",
    icon: BookOpenCheck,
  },
  exam: {
    label: "Examen",
    description: "Chronométré, sans correction avant la fin, noté sur 20.",
    icon: Timer,
  },
  redo: {
    label: "Refaire mes erreurs",
    description: "Uniquement les questions ratées la dernière fois.",
    icon: RotateCcw,
  },
};
