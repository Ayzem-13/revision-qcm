import type { ReactNode } from "react";
import { Check } from "lucide-react";
import {
  Choice,
  ChoiceContent,
  ChoiceDescription,
  ChoiceGroup,
  ChoiceIndicator,
  ChoiceLabel,
  ChoiceMarker,
} from "@/components/ui/choice-group";
import { MODES, MODE_ORDER, type Mode, type PoolSizes } from "@/domains/session/application";
import { MODE_COPY } from "../mode-copy";

const EMPTY_POOL: Record<"all" | "mistakes", string> = {
  all: "Aucune question dans la sélection.",
  mistakes: "Aucune erreur à refaire dans ces chapitres.",
};

export function ModePicker(props: { value: Mode; pools: PoolSizes; onChange: (mode: Mode) => void }): ReactNode {
  return (
    <ChoiceGroup
      selection="single"
      size="lg"
      aria-label="Mode"
      data-testid="mode-picker"
      value={[props.value]}
      onToggle={props.onChange}
    >
      {MODE_ORDER.map((mode) => {
        const { label, description, icon: Icon } = MODE_COPY[mode];
        const empty = props.pools[mode] === 0;
        return (
          <Choice key={mode} value={mode} disabled={empty} data-testid={`mode-${mode}`}>
            <ChoiceMarker>
              <Icon />
            </ChoiceMarker>
            <ChoiceContent>
              <ChoiceLabel>{label}</ChoiceLabel>
              <ChoiceDescription>
                <span className="grid">
                  <span
                    aria-hidden={empty}
                    className={empty ? "invisible col-start-1 row-start-1" : "col-start-1 row-start-1"}
                  >
                    {description}
                  </span>
                  <span
                    aria-hidden={!empty}
                    className={empty ? "col-start-1 row-start-1" : "invisible col-start-1 row-start-1"}
                  >
                    {EMPTY_POOL[MODES[mode].pool]}
                  </span>
                </span>
              </ChoiceDescription>
            </ChoiceContent>
            <ChoiceIndicator>
              <Check />
            </ChoiceIndicator>
          </Choice>
        );
      })}
    </ChoiceGroup>
  );
}
