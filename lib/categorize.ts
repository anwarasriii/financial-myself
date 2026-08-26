export interface CategoryRuleLike {
  bucketId: string;
  keyword: string;
}

/** Matches a transaction description against keyword rules, longest keyword wins. */
export function matchBucket(description: string, rules: CategoryRuleLike[]): string | null {
  const lower = description.toLowerCase();
  let best: CategoryRuleLike | null = null;

  for (const rule of rules) {
    const keyword = rule.keyword.toLowerCase().trim();
    if (!keyword) continue;
    if (lower.includes(keyword) && (!best || keyword.length > best.keyword.length)) {
      best = rule;
    }
  }

  return best?.bucketId ?? null;
}
