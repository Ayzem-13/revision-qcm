import { useState, type ReactNode } from "react";
import { ArrowLeft, Hourglass, PartyPopper, RotateCcw, Shuffle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Reveal, Stagger } from "@/components/ui/motion";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";
import type { ResultsView, Study } from "@/domains/session/application";
import { ChapterBreakdown, MODE_COPY, ReviewCard, ScoreDial } from "@/domains/session/components";
import { formatDuration } from "@/shared/components";

const PAGE = 20;

type Filter = "mistakes" | "all";

function headlineOf(ratio: number): string {
  if (ratio >= 0.9) return "Excellent !";
  if (ratio >= 0.75) return "Très bien joué";
  if (ratio >= 0.5) return "C'est en bonne voie";
  return "On continue, ça va rentrer";
}

export function ResultsPage(props: { study: Study; view: ResultsView }): ReactNode {
  const { study, view } = props;
  const deferred = view.policy.feedback === "deferred";
  const [filter, setFilter] = useState<Filter>("mistakes");
  const [shown, setShown] = useState(PAGE);

  const ratio = view.total === 0 ? 0 : view.correct / view.total;
  const redoPool = study.poolSizes(view.setup.chapterIds).redo;
  const reviewed = deferred && filter === "all" ? view.reviewed : view.mistakes;
  const visible = reviewed.slice(0, shown);
  const hasMistakes = view.mistakes.length > 0;

  return (
    <div className="flex flex-col gap-8 pt-2 pb-10">
      <Card size="lg" asChild>
        <section aria-labelledby="score">
          <CardContent className="flex flex-col items-center gap-6 text-center">
            <Reveal>
              <ScoreDial correct={view.correct} total={view.total} markOutOf20={deferred ? view.markOutOf20 : null} />
            </Reveal>
            <Reveal>
              <h1 id="score" className="text-4xl leading-tight font-semibold font-stretch-112%">
                {headlineOf(ratio)}
              </h1>
              <p className="mt-1 text-base text-muted-foreground">
                {MODE_COPY[view.setup.mode].label}, {view.correct} bonnes réponses sur {view.total} en{" "}
                {formatDuration(view.durationMs)}.
              </p>
            </Reveal>
            {view.ending === "timeout" && (
              <Alert variant="destructive" role="status" className="max-w-lg">
                <Hourglass aria-hidden="true" />
                <AlertTitle>Temps écoulé</AlertTitle>
                <AlertDescription>Les questions sans réponse comptent comme fausses.</AlertDescription>
              </Alert>
            )}
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-center">
              {hasMistakes && (
                <Button
                  size="lg"
                  disabled={redoPool === 0}
                  onClick={() => study.start({ ...view.setup, mode: "redo" })}
                >
                  <RotateCcw aria-hidden="true" />
                  Refaire mes erreurs
                </Button>
              )}
              <Button size="lg" variant={hasMistakes ? "secondary" : "default"} onClick={study.replay}>
                <Shuffle aria-hidden="true" />
                Rejouer
              </Button>
              <Button size="lg" variant="ghost" onClick={study.quit}>
                <ArrowLeft aria-hidden="true" />
                Retour à la matière
              </Button>
            </div>
            {hasMistakes && redoPool === 0 && (
              <p className="text-sm text-muted-foreground">
                Les questions sans réponse ne sont pas comptées comme erreurs à refaire.
              </p>
            )}
          </CardContent>
        </section>
      </Card>

      {view.byChapter.length > 1 && (
        <Reveal>
          <Card size="lg" asChild>
            <section aria-labelledby="par-chapitre">
              <CardHeader>
                <CardTitle id="par-chapitre">Par chapitre</CardTitle>
              </CardHeader>
              <CardContent>
                <ChapterBreakdown scores={view.byChapter} />
              </CardContent>
            </section>
          </Card>
        </Reveal>
      )}

      <section aria-labelledby="correction" className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="correction" className="text-xl font-medium">
            {deferred && filter === "all" ? "Correction complète" : "Vos erreurs"}
          </h2>
          {deferred && (
            <SegmentedControl<Filter>
              aria-label="Questions à afficher"
              className="sm:w-80"
              value={filter}
              onValueChange={(next) => {
                setFilter(next);
                setShown(PAGE);
              }}
            >
              <SegmentedControlItem value="mistakes">Erreurs ({view.mistakes.length})</SegmentedControlItem>
              <SegmentedControlItem value="all">Toutes ({view.reviewed.length})</SegmentedControlItem>
            </SegmentedControl>
          )}
        </div>

        {reviewed.length === 0 ? (
          <Alert variant="success" role="status">
            <PartyPopper aria-hidden="true" />
            <AlertTitle>Sans faute !</AlertTitle>
            <AlertDescription>Aucune erreur à corriger cette fois.</AlertDescription>
          </Alert>
        ) : (
          <>
            <Stagger step="list" className="flex flex-col gap-3">
              {visible.map((item) => (
                <Reveal key={item.id}>
                  <ReviewCard reviewed={item} />
                </Reveal>
              ))}
            </Stagger>
            {reviewed.length > shown && (
              <div className="flex justify-center">
                <Button variant="secondary" onClick={() => setShown((count) => count + PAGE)}>
                  Afficher {Math.min(PAGE, reviewed.length - shown)} de plus ({reviewed.length - shown} restantes)
                </Button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
