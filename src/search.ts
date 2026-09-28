export type SearchEntry = {
  id: string;
  label: string;
  keywords?: string;
};

export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");
}

export function searchEntities(
  entries: SearchEntry[],
  query: string,
  limit = 8,
): SearchEntry[] {
  const normalizedQuery = normalizeSearchText(query.trim());
  if (!normalizedQuery) return entries.slice(0, limit);

  return entries
    .filter((entry) => {
      const haystack = normalizeSearchText(`${entry.label} ${entry.keywords ?? ""}`);
      return haystack.includes(normalizedQuery);
    })
    .slice(0, limit);
}
