import { useEffect, useRef } from "react";
import type { ChoiceId } from "@/domains/catalog/application";
import type { QuestionView } from "@/domains/session/application";

export type SessionKeyHandlers = {
  readonly toggle: (choiceId: ChoiceId) => void;
  readonly primary: () => void;
  readonly goTo: (index: number) => void;
};

const DIGITS: Readonly<Record<string, number>> = {
  Digit1: 1,
  Digit2: 2,
  Digit3: 3,
  Digit4: 4,
  Digit5: 5,
  Digit6: 6,
  Digit7: 7,
  Digit8: 8,
  Digit9: 9,
  Numpad1: 1,
  Numpad2: 2,
  Numpad3: 3,
  Numpad4: 4,
  Numpad5: 5,
  Numpad6: 6,
  Numpad7: 7,
  Numpad8: 8,
  Numpad9: 9,
};

function isFormField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || target.closest("input, textarea, select, [contenteditable='true']") !== null;
}

function layerOpen(): boolean {
  return document.querySelector("[role='dialog'], [role='alertdialog'], [role='menu']") !== null;
}

function ownsEnter(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.closest("[data-slot='choice']") !== null) return false;
  return target.closest("button, a[href], [role='button'], [role='radio'], [role='checkbox'], [role='tab']") !== null;
}

export function useSessionKeys(view: QuestionView, handlers: SessionKeyHandlers): void {
  const latest = useRef({ view, handlers });

  useEffect(() => {
    latest.current = { view, handlers };
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      if (isFormField(event.target) || layerOpen()) return;
      const { view: current, handlers: act } = latest.current;

      const digit = DIGITS[event.code];
      if (digit !== undefined) {
        const choice = current.choices[digit - 1];
        if (choice === undefined) return;
        event.preventDefault();
        act.toggle(choice.id);
        return;
      }

      if (event.key === "Enter") {
        if (event.repeat || ownsEnter(event.target)) return;
        event.preventDefault();
        act.primary();
        return;
      }

      if (current.policy.navigation !== "free") return;
      if (event.key === "ArrowLeft" && current.index > 0) {
        event.preventDefault();
        act.goTo(current.index - 1);
      } else if (event.key === "ArrowRight" && current.index < current.total - 1) {
        event.preventDefault();
        act.goTo(current.index + 1);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
