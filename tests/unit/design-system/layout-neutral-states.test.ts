import { describe, expect, test } from "bun:test";
import { actionBarPanelVariants } from "@/components/ui/action-bar";
import { badgeVariants } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cardVariants } from "@/components/ui/card";
import { choiceIndicatorVariants, choiceMarkerVariants, choiceVariants } from "@/components/ui/choice-group";

const APPEARANCE =
  /^(?:bg-|text-(?:foreground|background|primary|secondary|tertiary|muted|accent|destructive|success|card|popover|transparent|current)|border-(?:primary|success|destructive|transparent|input|border|ring|dashed|solid)|rounded-|shadow-|ring-|opacity-|scale-|animate-|fade-|zoom-|duration-|ease-|underline)/;

function utilityOf(className: string): string {
  let depth = 0;
  let start = 0;
  for (let index = 0; index < className.length; index++) {
    const character = className[index];
    if (character === "[" || character === "(") depth++;
    if (character === "]" || character === ")") depth--;
    if (character === ":" && depth === 0) start = index + 1;
  }
  return className.slice(start);
}

function addedBy(
  render: (state: Record<string, unknown>) => string,
  base: Record<string, unknown>,
  states: readonly Record<string, unknown>[],
): string[] {
  const before = new Set(render(base).split(/\s+/));
  return states.flatMap((state) =>
    render({ ...base, ...state })
      .split(/\s+/)
      .filter((name) => name !== "" && !before.has(name)),
  );
}

function boxChanging(classes: readonly string[]): string[] {
  return [...new Set(classes)].filter((name) => !APPEARANCE.test(utilityOf(name)));
}

describe("a variant that represents a state changes appearance only", () => {
  const tones = ["default", "correct", "wrong", "missed", "neutral"] as const;

  test("the parser reads the utility behind variants", () => {
    expect(utilityOf("dark:data-[slot=x]:bg-success/15")).toBe("bg-success/15");
    expect(boxChanging(["hover:px-4", "data-checked:bg-primary"])).toEqual(["hover:px-4"]);
  });

  test("choice: every tone at both sizes", () => {
    for (const size of ["default", "lg"] as const) {
      const added = addedBy(
        (state) => choiceVariants(state),
        { size, tone: "default" },
        tones.map((tone) => ({ tone })),
      );
      expect(boxChanging(added)).toEqual([]);
    }
  });

  test("choice marker and indicator: every tone", () => {
    for (const shape of ["round", "square", "tile"] as const) {
      const added = addedBy(
        (state) => choiceMarkerVariants(state),
        { shape, tone: "default" },
        tones.map((tone) => ({ tone })),
      );
      expect(boxChanging(added)).toEqual([]);
    }
    const added = addedBy(
      (state) => choiceIndicatorVariants(state),
      { tone: "default" },
      tones.map((tone) => ({ tone })),
    );
    expect(boxChanging(added)).toEqual([]);
  });

  test("the checked look of a choice changes appearance only", () => {
    const checked = choiceVariants({ tone: "default" })
      .split(/\s+/)
      .filter((name) => name.includes("data-checked:") || name.includes("hover:"));
    expect(checked.length).toBeGreaterThan(0);
    expect(boxChanging(checked)).toEqual([]);
  });

  test("button: switching variant at a fixed size never changes the box", () => {
    const variants = ["default", "secondary", "tertiary", "outline", "ghost", "destructive", "link"] as const;
    for (const size of ["default", "lg", "icon", "tile"] as const) {
      const added = addedBy(
        (state) => buttonVariants(state),
        { size, variant: "default" },
        variants.map((variant) => ({ variant })),
      );
      expect(boxChanging(added)).toEqual([]);
    }
  });

  test("badge: switching variant at a fixed size never changes the box", () => {
    const variants = ["default", "secondary", "muted", "success", "destructive", "outline"] as const;
    for (const size of ["default", "lg"] as const) {
      const added = addedBy(
        (state) => badgeVariants(state),
        { size, variant: "muted" },
        variants.map((variant) => ({ variant })),
      );
      expect(boxChanging(added)).toEqual([]);
    }
  });

  test("card tones and correction panel tones", () => {
    const cardTones = ["default", "popover", "muted", "primary", "tertiary", "success"] as const;
    expect(
      boxChanging(
        addedBy(
          (state) => cardVariants(state),
          { tone: "default" },
          cardTones.map((tone) => ({ tone })),
        ),
      ),
    ).toEqual([]);
    const panelTones = ["neutral", "success", "destructive"] as const;
    expect(
      boxChanging(
        addedBy(
          (state) => actionBarPanelVariants(state),
          { tone: "neutral" },
          panelTones.map((tone) => ({ tone })),
        ),
      ),
    ).toEqual([]);
  });
});
