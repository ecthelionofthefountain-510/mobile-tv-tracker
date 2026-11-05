import { describe, expect, it } from "vitest";
import {
  normalizeRating10,
  toRating10,
  formatRating10,
  normalizeComment,
  RATING_SCALE,
} from "./rating";

describe("normalizeRating10", () => {
  it("clamps to 0–10 with one decimal", () => {
    expect(normalizeRating10(8.24)).toBe(8.2);
    expect(normalizeRating10(12)).toBe(10);
    expect(normalizeRating10(-1)).toBeUndefined();
    expect(normalizeRating10(0)).toBeUndefined();
    expect(normalizeRating10("7.5")).toBe(7.5);
    expect(normalizeRating10("nope")).toBeUndefined();
  });
});

describe("toRating10 (migration)", () => {
  it("doubles a legacy 1–5 value without the scale marker", () => {
    expect(toRating10(4, undefined)).toBe(8);
    expect(toRating10(5, undefined)).toBe(10);
    expect(toRating10(3, undefined)).toBe(6);
  });

  it("leaves an already-migrated value untouched", () => {
    expect(toRating10(8.2, RATING_SCALE)).toBe(8.2);
    expect(toRating10(10, RATING_SCALE)).toBe(10);
  });

  it("returns undefined for no rating", () => {
    expect(toRating10(0, RATING_SCALE)).toBeUndefined();
    expect(toRating10(undefined, undefined)).toBeUndefined();
  });
});

describe("formatRating10", () => {
  it("drops a .0 decimal and keeps real decimals", () => {
    expect(formatRating10(8)).toBe("8");
    expect(formatRating10(8.2)).toBe("8.2");
    expect(formatRating10(0)).toBe("");
  });
});

describe("normalizeComment", () => {
  it("trims, drops empties and caps length", () => {
    expect(normalizeComment("  hello  ")).toBe("hello");
    expect(normalizeComment("   ")).toBeUndefined();
    expect(normalizeComment(42)).toBeUndefined();
    expect(normalizeComment("x".repeat(3000))?.length).toBe(2000);
  });
});
