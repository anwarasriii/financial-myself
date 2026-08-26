// Categorical bucket identity, mapped to daisyUI's cupcake theme roles.
// Literal class names (not interpolated) so Tailwind's scanner picks them up.
const ROLES = [
  { dot: "bg-primary", progress: "progress-primary", text: "text-primary" },
  { dot: "bg-secondary", progress: "progress-secondary", text: "text-secondary" },
  { dot: "bg-accent", progress: "progress-accent", text: "text-accent" },
  { dot: "bg-info", progress: "progress-info", text: "text-info" },
  { dot: "bg-success", progress: "progress-success", text: "text-success" },
  { dot: "bg-neutral", progress: "progress-neutral", text: "text-neutral" },
  { dot: "bg-warning", progress: "progress-warning", text: "text-warning" },
  { dot: "bg-error", progress: "progress-error", text: "text-error" },
] as const;

export function bucketColor(index: number) {
  return ROLES[index % ROLES.length];
}

// Same role order as ROLES above, as actual CSS color values (the cupcake
// theme's --color-* custom properties) for contexts that need a real paint
// color rather than a Tailwind class — namely recharts, which renders SVG
// `fill`/`stroke` attributes rather than DOM classes.
const CSS_COLORS = [
  "var(--color-primary)",
  "var(--color-secondary)",
  "var(--color-accent)",
  "var(--color-info)",
  "var(--color-success)",
  "var(--color-neutral)",
  "var(--color-warning)",
  "var(--color-error)",
] as const;

export function bucketCssColor(index: number) {
  return CSS_COLORS[index % CSS_COLORS.length];
}
