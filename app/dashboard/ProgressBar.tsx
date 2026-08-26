export function ProgressBar({
  ratio,
  colorClass,
}: {
  ratio: number;
  colorClass: string;
}) {
  const pct = Math.round(Math.max(0, Math.min(1, ratio)) * 100);
  return (
    <progress className={`progress ${colorClass} w-full`} value={pct} max={100} />
  );
}
