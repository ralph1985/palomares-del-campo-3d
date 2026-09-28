import { describe, expect, it } from "vitest";
import { normalizeSearchText, searchEntities, type SearchEntry } from "../src/search";

const entries: SearchEntry[] = [
  { id: "church", label: "Iglesia de la Asunción", keywords: "historic place of worship" },
  { id: "town-hall", label: "Ayuntamiento", keywords: "amenity town hall" },
  { id: "road", label: "Calle Mayor", keywords: "highway residential" },
];

describe("searchEntities", () => {
  it("normalizes accents and case for matching", () => {
    expect(normalizeSearchText("Iglesía de la Asunción")).toBe("iglesia de la asuncion");
    expect(searchEntities(entries, "ASUNCION").map((entry) => entry.id)).toEqual(["church"]);
  });

  it("searches labels and keywords", () => {
    expect(searchEntities(entries, "town hall").map((entry) => entry.id)).toEqual(["town-hall"]);
  });

  it("returns all entries for an empty query and limits results", () => {
    expect(searchEntities(entries, "").map((entry) => entry.id)).toEqual([
      "church",
      "town-hall",
      "road",
    ]);
    expect(searchEntities(entries, "", 2)).toHaveLength(2);
  });
});
