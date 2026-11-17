import { useState, type ReactNode } from "react";
import { FolderPlus } from "lucide-react";
import { useApplication } from "@/app/provider";
import { hrefOf } from "@/app/route";
import { Card, CardContent } from "@/components/ui/card";
import { Code } from "@/components/ui/code";
import { Reveal, Stagger } from "@/components/ui/motion";
import { SubjectCard } from "@/domains/catalog/components";
import { ResumeBanner } from "@/domains/session/components";
import { useReadable } from "@/shared/components";

function greeting(): string {
  const hour = new Date().getHours();
  return hour >= 18 || hour < 5 ? "Bonsoir" : "Bonjour";
}

export function HomePage(): ReactNode {
  const application = useApplication();
  const [hello] = useState(greeting);
  const ongoingId = useReadable(application.ongoingSubjectId);
  const ongoing = application.subjects.find((subject) => subject.id === ongoingId);

  return (
    <div className="flex flex-col gap-8 pt-4 pb-6">
      <Reveal>
        <h1 className="text-4xl leading-tight font-semibold font-stretch-112% sm:text-6xl sm:leading-none">
          {hello}.<span className="block text-muted-foreground">Qu'est-ce qu'on révise ?</span>
        </h1>
      </Reveal>

      {ongoing !== undefined && <ResumeBanner subject={ongoing} href={hrefOf({ name: "subject", subject: ongoing })} />}

      {application.subjects.length === 0 ? (
        <EmptyState />
      ) : (
        <section aria-labelledby="matieres" className="flex flex-col gap-4">
          <h2 id="matieres" className="text-xl font-medium text-muted-foreground">
            Matières
          </h2>
          <Stagger step="list" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {application.subjects.map((subject) => (
              <Reveal key={subject.id}>
                <SubjectCard
                  subject={subject}
                  href={hrefOf({ name: "subject", subject })}
                  ongoing={subject.id === ongoingId}
                />
              </Reveal>
            ))}
          </Stagger>
        </section>
      )}
    </div>
  );
}

function EmptyState(): ReactNode {
  return (
    <Card size="lg">
      <CardContent className="flex flex-col items-center py-8 text-center">
        <span
          aria-hidden="true"
          className="grid size-20 place-items-center rounded-4xl bg-secondary text-secondary-foreground"
        >
          <FolderPlus className="size-9" />
        </span>
        <h2 className="mt-6 text-2xl font-medium">Aucune matière pour l'instant</h2>
        <p className="mt-2 max-w-md text-base text-muted-foreground">
          Ajoutez un dossier dans <Code>content/</Code> avec un fichier JSON par chapitre, puis rechargez la page.
        </p>
      </CardContent>
    </Card>
  );
}
