import { describe, it, expect } from "vitest";
import { getPageCount, clampPage, getPageSlice } from "./paginate";

describe("paginate", () => {
  describe("getPageCount", () => {
    it("computes pages for an exact multiple (happy path)", () => {
      expect(getPageCount(24, 12)).toBe(2);
    });
    it("rounds up a partial last page", () => {
      expect(getPageCount(13, 12)).toBe(2);
      expect(getPageCount(13, 6)).toBe(3);
    });
    it("returns at least 1 for an empty list (edge case)", () => {
      expect(getPageCount(0, 12)).toBe(1);
    });
    it("returns 1 for a non-positive page size (error resilience)", () => {
      expect(getPageCount(50, 0)).toBe(1);
      expect(getPageCount(50, -5)).toBe(1);
    });
  });

  describe("clampPage", () => {
    it("keeps an in-range page (happy path)", () => {
      expect(clampPage(1, 3)).toBe(1);
    });
    it("clamps a page past the end back to the last page (edge case)", () => {
      expect(clampPage(5, 3)).toBe(2);
    });
    it("never goes below 0", () => {
      expect(clampPage(-2, 3)).toBe(0);
    });
    it("handles a non-finite page (error resilience)", () => {
      expect(clampPage(NaN, 3)).toBe(0);
    });
  });

  describe("getPageSlice", () => {
    const list = Array.from({ length: 13 }, (_, i) => i + 1); // 1..13

    it("returns the first page (happy path)", () => {
      expect(getPageSlice(list, 0, 6)).toEqual([1, 2, 3, 4, 5, 6]);
    });
    it("returns a short final page (edge case)", () => {
      expect(getPageSlice(list, 2, 6)).toEqual([13]);
    });
    it("returns empty for a page past the end", () => {
      expect(getPageSlice(list, 9, 6)).toEqual([]);
    });
    it("returns empty for a non-array or bad page size (error resilience)", () => {
      expect(getPageSlice(null, 0, 6)).toEqual([]);
      expect(getPageSlice(list, 0, 0)).toEqual([]);
    });
  });
});
