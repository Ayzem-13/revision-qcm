import { useId, useRef, useState, type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Checkbox, CheckboxGroup } from "@/components/ui/checkbox";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Reveal, Stagger } from "@/components/ui/motion";
import type { ChapterId } from "@/domains/catalog/application";
import type { ChapterOverview, SectionOverview } from "@/domains/progress/application";
import { MasteryBar, describeMastery } from "@/domains/progress/components";
import { plural } from "@/shared/components";

export function ChapterPicker(props: {
  sections: readonly SectionOverview[];
  selected: ReadonlySet<ChapterId>;
  onChange: (section: SectionOverview, chapterIds: readonly ChapterId[]) => void;
}): ReactNode {
  const list = useRef<HTMLDivElement>(null);
  const [heldHeight, setHeldHeight] = useState(0);
  const holdHeight = (): void => {
    const height = list.current?.offsetHeight ?? 0;
    setHeldHeight((held) => Math.max(held, height));
  };

  return (
    <div ref={list} className="min-h-(--held-height)" style={{ "--held-height": `${heldHeight}px` }}>
      <Stagger step="list" className="flex flex-col gap-4">
        {props.sections.map((section, index) => (
          <Reveal key={section.title}>
            <SectionPicker
              onFold={holdHeight}
              section={section}
              testId={`section-${index + 1}`}
              startsOpen={index === props.sections.length - 1}
              selected={section.chapters
                .filter((chapter) => props.selected.has(chapter.id))
                .map((chapter) => chapter.id)}
              onChange={(chapterIds) => props.onChange(section, chapterIds)}
            />
          </Reveal>
        ))}
      </Stagger>
    </div>
  );
}

function SectionPicker(props: {
  section: SectionOverview;
  testId: string;
  startsOpen: boolean;
  onFold: () => void;
  selected: readonly ChapterId[];
  onChange: (chapterIds: readonly ChapterId[]) => void;
}): ReactNode {
  const id = useId();
  const questions = props.section.chapters.reduce((sum, chapter) => sum + chapter.questionCount, 0);

  return (
    <Card asChild size="sm">
      <section aria-labelledby={`${id}-title`} data-testid={props.testId} className="gap-0 py-0">
        <CheckboxGroup<ChapterId>
          aria-labelledby={`${id}-title`}
          value={[...props.selected]}
          allValues={props.section.chapters.map((chapter) => chapter.id)}
          onValueChange={props.onChange}
        >
          <Collapsible
            defaultOpen={props.startsOpen}
            onOpenChange={(open) => {
              if (!open) props.onFold();
            }}
          >
            <div className="flex items-center bg-muted pr-3">
              <label className="flex min-h-18 min-w-0 flex-1 cursor-pointer items-center gap-4 px-5 py-3 transition-colors duration-200 hover:bg-accent has-focus-visible:bg-accent">
                <Checkbox parent aria-labelledby={`${id}-title`} aria-describedby={`${id}-meta`} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span id={`${id}-title`} className="text-base font-semibold">
                    {props.section.title}
                  </span>
                  <span id={`${id}-meta`} className="text-sm text-muted-foreground">
                    {plural(props.section.chapters.length, "chapitre", "chapitres")},{" "}
                    {plural(questions, "question", "questions")}
                  </span>
                </span>
              </label>
              <CollapsibleTrigger
                data-testid={`fold-${props.testId}`}
                aria-label={`Chapitres de la section ${props.section.title}`}
              />
            </div>
            <CollapsiblePanel>
              <ul className="flex flex-col gap-0.5 p-1.5">
                {props.section.chapters.map((chapter) => (
                  <li key={chapter.id}>
                    <ChapterRow chapter={chapter} />
                  </li>
                ))}
              </ul>
            </CollapsiblePanel>
          </Collapsible>
        </CheckboxGroup>
      </section>
    </Card>
  );
}

function ChapterRow(props: { chapter: ChapterOverview }): ReactNode {
  const id = useId();
  const { chapter } = props;

  return (
    <label className="flex min-h-14 cursor-pointer items-center gap-4 rounded-2xl px-3.5 py-3 transition-colors duration-200 hover:bg-muted has-focus-visible:bg-muted">
      <Checkbox value={chapter.id} aria-labelledby={`${id}-title`} aria-describedby={`${id}-stats`} />
      <span className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="flex items-baseline justify-between gap-3">
          <span id={`${id}-title`} className="line-clamp-2 text-base">
            {chapter.title}
          </span>
          <span aria-hidden="true" className="shrink-0 text-xs font-semibold text-muted-foreground tabular-nums">
            {chapter.mastery.mastered}/{chapter.questionCount}
          </span>
        </span>
        <MasteryBar counts={chapter.mastery} decorative />
        <span id={`${id}-stats`} className="sr-only">
          {plural(chapter.questionCount, "question", "questions")} : {describeMastery(chapter.mastery)}.
        </span>
      </span>
    </label>
  );
}
