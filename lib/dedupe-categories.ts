/** Keep first category per unique name (case-insensitive). */
export const dedupeCategories = <T extends { id: string; name: string }>(list: T[]): T[] => {
  const seen = new Set<string>();
  return list.filter((c) => {
    const key = c.name.trim().toLowerCase();
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

export const normalizeCategoryName = (name: string) => name.trim();

export const categoryNamesConflict = (a: string, b: string) =>
  a.trim().toLowerCase() === b.trim().toLowerCase();
