import { Suspense, useEffect, type ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ErrorBoundary } from "@/components/layout/error-boundary";
import { SubjectLoading } from "@/components/layout/loading";
import { MotionProvider, ScreenTransition } from "@/components/ui/motion";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { SubjectSummary } from "@/domains/catalog/application";
import { useSeedHue } from "@/domains/catalog/components";
import { HomePage } from "@/pages/home";
import { ResultsPage } from "@/pages/results";
import { SessionPage } from "@/pages/session";
import { SetupPage } from "@/pages/setup";
import { useApplication, useStudy } from "./provider";
import { hrefOf, useRoute } from "./route";

const APP_TITLE = "Révision QCM";

export function App(): ReactNode {
  const { subjects, preferences } = useApplication();
  const route = useRoute(subjects);
  useSeedHue(route.name === "subject" ? route.subject.hue : null);

  useEffect(() => {
    document.title = route.name === "subject" ? `${route.subject.title} · ${APP_TITLE}` : APP_TITLE;
  }, [route]);

  return (
    <MotionProvider>
      <TooltipProvider>
        <AppShell
          title={route.name === "subject" ? route.subject.title : APP_TITLE}
          backHref={route.name === "subject" ? hrefOf({ name: "home" }) : null}
          preferences={preferences}
        >
          <ScreenTransition fill screenKey={route.name === "home" ? "home" : route.subject.id}>
            {route.name === "home" ? (
              <HomePage />
            ) : (
              <ErrorBoundary>
                <Suspense fallback={<SubjectLoading />}>
                  <SubjectArea summary={route.subject} />
                </Suspense>
              </ErrorBoundary>
            )}
          </ScreenTransition>
        </AppShell>
      </TooltipProvider>
    </MotionProvider>
  );
}

function SubjectArea(props: { summary: SubjectSummary }): ReactNode {
  const { study, state } = useStudy(props.summary.id);
  const session = state.session;

  return (
    <ScreenTransition fill screenKey={session?.kind ?? "setup"}>
      {session === null ? (
        <SetupPage study={study} overview={state.overview} />
      ) : session.kind === "question" ? (
        <SessionPage study={study} view={session} />
      ) : (
        <ResultsPage study={study} view={session} />
      )}
    </ScreenTransition>
  );
}
