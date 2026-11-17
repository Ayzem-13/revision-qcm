const numbers = new Intl.NumberFormat("fr-FR");

export function formatNumber(value: number): string {
  return numbers.format(value);
}

export function plural(count: number, one: string, many: string): string {
  return `${formatNumber(count)} ${count > 1 ? many : one}`;
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours} h ${minutes} min`;
  if (minutes > 0) return `${minutes} min ${seconds} s`;
  return `${seconds} s`;
}
