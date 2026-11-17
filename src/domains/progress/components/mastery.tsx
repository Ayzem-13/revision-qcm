import type { ReactNode } from "react";
import { StackedBar, StackedBarLegend, StackedBarLegendItem, type StackedBarTone } from "@/components/ui/stacked-bar";
import type { Mastery, MasteryCounts } from "@/domains/progress/application";
import { formatNumber } from "@/shared/components";

const MASTERY_ORDER = ["mastered", "learning", "missed", "new"] as const satisfies readonly Mastery[];

const MASTERY_LOOK: Record<Mastery, { readonly one: string; readonly many: string; readonly tone: StackedBarTone }> = {
  mastered: { one: "maîtrisée", many: "maîtrisées", tone: "chart-1" },
  learning: { one: "en cours", many: "en cours", tone: "chart-2" },
  missed: { one: "à revoir", many: "à revoir", tone: "chart-3" },
  new: { one: "jamais vue", many: "jamais vues", tone: "chart-4" },
};

function wordFor(level: Mastery, count: number): string {
  return count > 1 ? MASTERY_LOOK[level].many : MASTERY_LOOK[level].one;
}

export function describeMastery(counts: MasteryCounts): string {
  const parts = MASTERY_ORDER.filter((level) => counts[level] > 0).map(
    (level) => `${formatNumber(counts[level])} ${wordFor(level, counts[level])}`,
  );
  return parts.length === 0 ? "Aucune question" : parts.join(", ");
}

export function MasteryBar(props: { counts: MasteryCounts; size?: "default" | "lg"; decorative?: boolean }): ReactNode {
  const segments = MASTERY_ORDER.map((level) => ({
    key: level,
    value: props.counts[level],
    tone: MASTERY_LOOK[level].tone,
  }));
  const labelling =
    props.decorative === true ? { "aria-hidden": true } : { role: "img", "aria-label": describeMastery(props.counts) };
  return <StackedBar segments={segments} size={props.size ?? "default"} {...labelling} />;
}

export function MasteryLegend(props: { counts: MasteryCounts }): ReactNode {
  return (
    <StackedBarLegend aria-hidden="true">
      {MASTERY_ORDER.map((level) => (
        <StackedBarLegendItem key={level} tone={MASTERY_LOOK[level].tone}>
          <span className="font-medium text-foreground tabular-nums">{formatNumber(props.counts[level])}</span>
          {wordFor(level, props.counts[level])}
        </StackedBarLegendItem>
      ))}
    </StackedBarLegend>
  );
}
