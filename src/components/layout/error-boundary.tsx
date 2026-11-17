import { Component, type ErrorInfo, type ReactNode } from "react";
import { FileWarning, RotateCw, TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Code } from "@/components/ui/code";
import { InvalidSubject } from "@/domains/catalog/application";
import { plural } from "@/shared/components";

type State = { readonly error: unknown };

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { error };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error(error, info.componentStack);
  }

  render(): ReactNode {
    const { error } = this.state;
    if (error === null) return this.props.children;
    return error instanceof InvalidSubject ? <ContentIssues error={error} /> : <UnexpectedError />;
  }
}

function ContentIssues(props: { error: InvalidSubject }): ReactNode {
  return (
    <section className="mx-auto mt-6 flex w-full max-w-3xl flex-col gap-4">
      <Alert variant="destructive">
        <FileWarning aria-hidden="true" />
        <AlertTitle>
          <h1>Les questions de cette matière ne peuvent pas être chargées</h1>
        </AlertTitle>
        <AlertDescription>
          {plural(props.error.issues.length, "problème trouvé", "problèmes trouvés")} dans les fichiers. Corrigez-les
          puis rechargez la page : <Code>bun run content:check</Code> affiche la même liste.
        </AlertDescription>
      </Alert>
      <ol className="flex flex-col gap-2">
        {props.error.issues.map((issue) => (
          <li key={`${issue.file}:${issue.message}`}>
            <Card size="sm">
              <CardContent className="flex flex-col gap-1">
                <p className="font-mono text-sm font-semibold break-all">{issue.file}</p>
                <p className="text-base text-muted-foreground">{issue.message}</p>
              </CardContent>
            </Card>
          </li>
        ))}
      </ol>
      <ReloadButton />
    </section>
  );
}

function UnexpectedError(): ReactNode {
  return (
    <section className="mx-auto mt-10 flex w-full max-w-xl flex-col gap-6">
      <Alert variant="destructive">
        <TriangleAlert aria-hidden="true" />
        <AlertTitle>
          <h1>Un problème est survenu</h1>
        </AlertTitle>
        <AlertDescription>Votre progression est enregistrée. Rechargez la page pour reprendre.</AlertDescription>
      </Alert>
      <ReloadButton />
    </section>
  );
}

function ReloadButton(): ReactNode {
  return (
    <div className="flex justify-center">
      <Button onClick={() => window.location.reload()}>
        <RotateCw aria-hidden="true" />
        Recharger
      </Button>
    </div>
  );
}
