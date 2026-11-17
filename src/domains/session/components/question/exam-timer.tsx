import { useEffect, useRef, useState, type ReactNode } from "react";
import { Timer } from "lucide-react";
import { Badge } from "@/components/ui/badge";

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function formatRemaining(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

function spokenRemaining(ms: number): string {
  const minutes = Math.ceil(ms / 60000);
  return minutes <= 1 ? "moins d'une minute" : `${minutes} minutes`;
}

export function ExamTimer(props: { deadlineAt: number; onExpire: () => void }): ReactNode {
  const [now, setNow] = useState(() => Date.now());
  const expired = useRef(false);
  const onExpire = useRef(props.onExpire);

  useEffect(() => {
    onExpire.current = props.onExpire;
  }, [props.onExpire]);

  useEffect(() => {
    const tick = (): void => setNow(Date.now());
    const interval = window.setInterval(tick, 1000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);

  const remaining = Math.max(0, props.deadlineAt - now);
  const urgent = remaining < 60_000;

  useEffect(() => {
    if (remaining > 0 || expired.current) return;
    expired.current = true;
    onExpire.current();
  }, [remaining]);

  return (
    <Badge size="lg" variant={urgent ? "destructive" : "muted"} data-testid="exam-timer">
      <Timer aria-hidden="true" className={urgent ? "animate-pulse" : undefined} />
      <span role="timer" aria-label={`Temps restant : ${spokenRemaining(remaining)}`}>
        {formatRemaining(remaining)}
      </span>
      <span className="sr-only" aria-live="assertive">
        {urgent && remaining > 0 ? "Moins d'une minute restante." : ""}
      </span>
    </Badge>
  );
}
