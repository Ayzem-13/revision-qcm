import type { ReactNode } from "react";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";

const ALL_QUESTIONS = Number.MAX_SAFE_INTEGER;

const PRESETS = ["10", "20", "40"] as const;

type Option = (typeof PRESETS)[number] | "all";

function optionOf(value: number, max: number): Option {
  if (value >= max) return "all";
  return PRESETS.find((preset) => Number(preset) === value) ?? "all";
}

export function CountPicker(props: { value: number; max: number; onChange: (count: number) => void }): ReactNode {
  return (
    <SegmentedControl<Option>
      aria-label="Nombre de questions"
      data-testid="count-picker"
      value={optionOf(props.value, props.max)}
      onValueChange={(option) => props.onChange(option === "all" ? ALL_QUESTIONS : Number(option))}
    >
      {PRESETS.map((preset) => (
        <SegmentedControlItem
          key={preset}
          value={preset}
          disabled={Number(preset) >= props.max}
          aria-label={`${preset} questions`}
        >
          {preset}
        </SegmentedControlItem>
      ))}
      <SegmentedControlItem value="all" aria-label={`Tout, ${props.max} questions`}>
        Tout
      </SegmentedControlItem>
    </SegmentedControl>
  );
}
