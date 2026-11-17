import type { ReactNode } from "react";
import { ArrowUpRight, BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { SubjectSummary } from "@/domains/catalog/application";
import { plural } from "@/shared/components";
import { hueScope } from "./hue";

export function SubjectCard(props: { subject: SubjectSummary; href: string; ongoing: boolean }): ReactNode {
  const { subject } = props;

  return (
    <Card asChild tone="primary" size="lg" interactive {...hueScope(subject.hue)}>
      <a href={props.href} data-testid={`subject-${subject.id}`} className="min-h-52">
        <span
          aria-hidden="true"
          className="absolute -top-12 -right-12 -z-10 size-40 rounded-4xl bg-tertiary/20 transition-all duration-500 ease-emphasized group-hover/card:rounded-3xl"
        />
        <CardContent className="flex flex-1 flex-col justify-between gap-8">
          <span
            aria-hidden="true"
            className="grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground transition-all duration-300 ease-emphasized group-hover/card:rounded-3xl"
          >
            <BookOpen className="size-7" />
          </span>
          <span className="flex items-end justify-between gap-4">
            <span className="flex min-w-0 flex-col gap-1">
              <span className="text-2xl leading-tight font-medium font-stretch-110%">{subject.title}</span>
              <span className="text-sm text-muted-foreground">
                {plural(subject.chapterCount, "chapitre", "chapitres")}
                {props.ongoing ? ", session en cours" : ""}
              </span>
            </span>
            <ArrowUpRight aria-hidden="true" className="size-7 shrink-0" />
          </span>
        </CardContent>
      </a>
    </Card>
  );
}
