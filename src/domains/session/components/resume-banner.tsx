import type { ReactNode } from "react";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Reveal } from "@/components/ui/motion";
import type { SubjectSummary } from "@/domains/catalog/application";
import { hueScope } from "@/domains/catalog/components";

export function ResumeBanner(props: { subject: SubjectSummary; href: string }): ReactNode {
  return (
    <Reveal>
      <Card asChild tone="tertiary" size="lg" {...hueScope(props.subject.hue)}>
        <section aria-label="Session en cours" data-testid="resume-banner">
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <span
              aria-hidden="true"
              className="grid size-12 shrink-0 place-items-center rounded-2xl bg-tertiary text-tertiary-foreground"
            >
              <Play className="size-6" />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="text-xl font-medium">Une session vous attend</p>
              <p className="text-base text-muted-foreground">Reprenez là où vous en étiez en {props.subject.title}.</p>
            </div>
            <Button asChild variant="tertiary">
              <a href={props.href}>Reprendre</a>
            </Button>
          </CardContent>
        </section>
      </Card>
    </Reveal>
  );
}
