const currencyFormatter = new Intl.NumberFormat("en-MY", {
  style: "currency",
  currency: "MYR",
});

export function formatMoney(amount: number): string {
  return currencyFormatter.format(amount);
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function formatMonth(month: number): string {
  return MONTH_NAMES[(month - 1 + 12) % 12];
}

function clampToMonth(year: number, month: number, day: number): Date {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, lastDay));
}

/** Days until the next occurrence of this day-of-month (0 = due today). */
export function daysUntilDueDay(dueDay: number): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const thisMonth = clampToMonth(today.getFullYear(), today.getMonth(), dueDay);
  const target = thisMonth >= today ? thisMonth : clampToMonth(today.getFullYear(), today.getMonth() + 1, dueDay);

  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export function formatDueIn(days: number): string {
  if (days === 0) return "due today";
  if (days === 1) return "due tomorrow";
  return `due in ${days} days`;
}
