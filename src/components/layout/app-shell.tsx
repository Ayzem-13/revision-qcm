import { useSyncExternalStore, type ReactNode } from "react";
import { ArrowLeft, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PreferencesSource } from "@/domains/preferences/application";
import { ThemeToggle } from "@/domains/preferences/components";

function subscribeToScroll(listener: () => void): () => void {
  window.addEventListener("scroll", listener, { passive: true });
  return () => window.removeEventListener("scroll", listener);
}

function isScrolled(): boolean {
  return window.scrollY > 4;
}

export function AppShell(props: {
  title: string;
  backHref: string | null;
  preferences: PreferencesSource;
  children: ReactNode;
}): ReactNode {
  const scrolled = useSyncExternalStore(subscribeToScroll, isScrolled, () => false);

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#contenu"
        className="sr-only z-50 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground outline-none focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        Aller au contenu
      </a>
      <header
        data-scrolled={scrolled ? "" : undefined}
        className="sticky top-0 z-30 bg-background transition-colors duration-300 ease-standard data-scrolled:bg-popover"
      >
        <div data-testid="app-bar" className="mx-auto flex h-16 w-full max-w-6xl items-center gap-2 px-2 sm:px-4">
          {props.backHref === null ? (
            <span
              aria-hidden="true"
              className="ml-2 grid size-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground"
            >
              <GraduationCap className="size-6" />
            </span>
          ) : (
            <Button asChild variant="ghost" size="icon">
              <a href={props.backHref} aria-label="Retour aux matières">
                <ArrowLeft aria-hidden="true" />
              </a>
            </Button>
          )}
          <p className="min-w-0 flex-1 truncate px-2 text-xl font-medium">{props.title}</p>
          <ThemeToggle preferences={props.preferences} />
        </div>
      </header>
      <main
        id="contenu"
        tabIndex={-1}
        className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pt-2 pb-8 outline-none sm:px-6"
      >
        {props.children}
      </main>
    </div>
  );
}
