import { useState, type ReactNode } from "react";
import { Check, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export function QuestionNavigator(props: {
  answered: readonly boolean[];
  current: number;
  onGoTo: (index: number) => void;
}): ReactNode {
  const [open, setOpen] = useState(false);
  const answeredCount = props.answered.filter(Boolean).length;
  const total = props.answered.length;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="secondary"
          data-testid="navigator"
          aria-label={`Toutes les questions, ${answeredCount} répondues sur ${total}`}
        >
          <LayoutGrid aria-hidden="true" />
          <span className="grid text-left tabular-nums">
            <span aria-hidden="true" className="invisible col-start-1 row-start-1">
              {total}/{total}
            </span>
            <span className="col-start-1 row-start-1">
              {answeredCount}/{total}
            </span>
          </span>
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>Questions</SheetTitle>
          <SheetDescription>
            {answeredCount} répondues, {total - answeredCount} sans réponse. Touchez un numéro pour y aller.
          </SheetDescription>
        </SheetHeader>
        <nav aria-label="Aller à une question" className="overflow-y-auto px-6 pt-2 pb-6">
          <ol className="grid grid-cols-5 gap-2 min-[400px]:grid-cols-6 sm:grid-cols-10">
            {props.answered.map((done, index) => (
              <li key={`question-${index + 1}`}>
                <Button
                  size="tile"
                  variant={done ? "secondary" : "outline"}
                  aria-current={index === props.current ? "step" : undefined}
                  aria-label={`Question ${index + 1}, ${done ? "répondue" : "sans réponse"}`}
                  className="relative"
                  onClick={() => {
                    props.onGoTo(index);
                    setOpen(false);
                  }}
                >
                  {index + 1}
                  {done && <Check aria-hidden="true" strokeWidth={3} className="absolute top-1 right-1 size-3" />}
                </Button>
              </li>
            ))}
          </ol>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
