import { useMemo, useState, type ReactNode } from "react";
import { ListChecks, Play, RotateCcw } from "lucide-react";
import { useApplication } from "@/app/provider";
import { ActionBar, ActionBarPrimary, ActionBarRow, ActionBarStatus } from "@/components/ui/action-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Reveal } from "@/components/ui/motion";
import type { ChapterId } from "@/domains/catalog/application";
import type { SectionOverview, SubjectOverview } from "@/domains/progress/application";
import { MasteryBar, MasteryLegend } from "@/domains/progress/components";
import { MODES, type Mode, type Study } from "@/domains/session/application";
import { ChapterPicker, CountPicker, MODE_COPY, ModePicker } from "@/domains/session/components";
import { ConfirmDialog, formatNumber, plural, useReadable } from "@/shared/components";

export function SetupPage(props: { study: Study; overview: SubjectOverview }): ReactNode {
  const { study, overview } = props;
  const preferences = useReadable(useApplication().preferences);
  const chapters = useMemo(() => overview.sections.flatMap((section) => section.chapters), [overview]);

  const [selected, setSelected] = useState<ReadonlySet<ChapterId>>(() => {
    const all = chapters.map((chapter) => chapter.id);
    const remembered = all.filter((id) => preferences.lastChapters[overview.id]?.includes(id));
    return new Set(remembered.length === 0 ? all : remembered);
  });
  const [mode, setMode] = useState<Mode>(preferences.lastMode);
  const [count, setCount] = useState(preferences.lastCount);
  const [confirmReset, setConfirmReset] = useState(false);

  const chapterIds = useMemo(
    () => chapters.filter((chapter) => selected.has(chapter.id)).map((chapter) => chapter.id),
    [chapters, selected],
  );
  const pools = study.poolSizes(chapterIds);
  const pool = pools[mode];
  const effective = Math.min(count, pool);
  const seconds = MODES[mode].secondsPerQuestion;
  const blocker =
    chapterIds.length === 0
      ? "Sélectionnez au moins un chapitre."
      : pool === 0
        ? MODES[mode].pool === "mistakes"
          ? "Aucune erreur à refaire dans ces chapitres."
          : "Aucune question dans la sélection."
        : null;
  const summary =
    blocker ??
    `${plural(effective, "question", "questions")}${seconds === null ? "" : `, ${Math.ceil((effective * seconds) / 60)} min`}`;
  const allSelected = chapterIds.length === chapters.length;
  const masteredShare =
    overview.questionCount === 0 ? 0 : Math.round((overview.mastery.mastered / overview.questionCount) * 100);

  const replaceSection = (section: SectionOverview, ids: readonly ChapterId[]): void => {
    setSelected((current) => {
      const next = new Set(current);
      for (const chapter of section.chapters) next.delete(chapter.id);
      for (const id of ids) next.add(id);
      return next;
    });
  };

  const start = (): void => {
    const [first, ...rest] = chapterIds;
    if (first === undefined || blocker !== null) return;
    study.start({ chapterIds: [first, ...rest], count, mode });
  };

  return (
    <div className="flex flex-col pt-2 pb-36 lg:pb-8">
      <Reveal>
        <header data-testid="setup-header" className="flex items-start gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h1 className="text-3xl leading-tight font-semibold wrap-break-word font-stretch-110% sm:text-5xl sm:leading-tight">
              {overview.title}
            </h1>
            <p className="text-base text-muted-foreground">
              {plural(overview.questionCount, "question", "questions")} dans{" "}
              {plural(chapters.length, "chapitre", "chapitres")}
            </p>
          </div>
          <Button
            variant="destructive"
            size="icon"
            className="sm:hidden"
            aria-label="Réinitialiser la progression"
            onClick={() => setConfirmReset(true)}
          >
            <RotateCcw aria-hidden="true" />
          </Button>
          <Button variant="destructive" className="hidden sm:inline-flex" onClick={() => setConfirmReset(true)}>
            <RotateCcw aria-hidden="true" />
            Réinitialiser
          </Button>
        </header>
        <Card className="mt-6" data-testid="progress-summary">
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-base font-semibold">Votre progression</h2>
              <span className="text-sm font-semibold text-muted-foreground tabular-nums">
                {masteredShare} % maîtrisé
              </span>
            </div>
            <MasteryBar counts={overview.mastery} size="lg" />
            <MasteryLegend counts={overview.mastery} />
          </CardContent>
        </Card>
      </Reveal>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
        <section aria-labelledby="chapitres" className="flex min-w-0 flex-col gap-4">
          <div data-testid="chapters-heading" className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <h2 id="chapitres" className="flex items-baseline gap-2 text-xl font-medium">
              Chapitres
              <span className="min-w-14 text-base text-muted-foreground tabular-nums">
                {formatNumber(chapterIds.length)}/{formatNumber(chapters.length)}
              </span>
            </h2>
            <Button
              variant="ghost"
              data-testid="toggle-all"
              onClick={() => setSelected(new Set(allSelected ? [] : chapters.map((chapter) => chapter.id)))}
            >
              <ListChecks aria-hidden="true" />
              <span className="grid">
                <span className={allSelected ? "col-start-1 row-start-1" : "invisible col-start-1 row-start-1"}>
                  Tout désélectionner
                </span>
                <span className={allSelected ? "invisible col-start-1 row-start-1" : "col-start-1 row-start-1"}>
                  Tout sélectionner
                </span>
              </span>
            </Button>
          </div>
          <ChapterPicker sections={overview.sections} selected={selected} onChange={replaceSection} />
        </section>

        <aside aria-labelledby="reglages" className="order-first min-w-0 lg:sticky lg:top-20 lg:order-none">
          <Reveal>
            <Card tone="popover" size="lg">
              <CardHeader>
                <CardTitle id="reglages">Nouvelle session</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                <ModePicker value={mode} pools={pools} onChange={setMode} />
                <div className="flex flex-col gap-2">
                  <h3 className="text-sm font-semibold text-muted-foreground">Nombre de questions</h3>
                  <CountPicker value={count} max={pools[mode]} onChange={setCount} />
                </div>
                <div className="hidden flex-col gap-3 lg:flex">
                  <p data-testid="start-summary" aria-live="polite" className="truncate text-sm text-muted-foreground">
                    {summary}
                  </p>
                  <Button size="lg" className="w-full" disabled={blocker !== null} onClick={start}>
                    <Play aria-hidden="true" />
                    Commencer
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Reveal>
        </aside>
      </div>

      <ActionBar placement="fixed" className="lg:hidden" data-testid="start-bar">
        <ActionBarRow>
          <ActionBarStatus>
            <p aria-live="polite" className="flex min-w-0 flex-col">
              <span className="truncate font-semibold text-foreground">{MODE_COPY[mode].label}</span>
              <span className="truncate">{summary}</span>
            </p>
          </ActionBarStatus>
          <ActionBarPrimary>
            <Button size="lg" disabled={blocker !== null} onClick={start}>
              <Play aria-hidden="true" />
              Commencer
            </Button>
          </ActionBarPrimary>
        </ActionBarRow>
      </ActionBar>

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Réinitialiser la progression ?"
        description={`Toutes les questions de ${overview.title} redeviennent « jamais vues ». Cette action est définitive.`}
        cancel="Annuler"
        confirm="Réinitialiser"
        tone="destructive"
        onConfirm={study.resetProgress}
      />
    </div>
  );
}
