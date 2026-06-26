import { describe, it, expect } from "vitest";
import { SLUG_REGEX } from "@/lib/slug";

describe("SLUG_REGEX", () => {
  it("accepts a valid 6-char slug", () => {
    expect(SLUG_REGEX.test("aB3456")).toBe(true);
  });

  it("rejects slug shorter than 6 chars", () => {
    expect(SLUG_REGEX.test("aB345")).toBe(false);
  });

  it("rejects slug longer than 6 chars", () => {
    expect(SLUG_REGEX.test("aB34567")).toBe(false);
  });

  it("rejects slug with 0 and 1 (ambiguous chars)", () => {
    expect(SLUG_REGEX.test("aB3406")).toBe(false);
    expect(SLUG_REGEX.test("aB3416")).toBe(false);
  });

  it("rejects slug with O and I (ambiguous uppercase)", () => {
    expect(SLUG_REGEX.test("aB34OI")).toBe(false);
    expect(SLUG_REGEX.test("aB34IO")).toBe(false);
  });

  it("rejects slug with special characters", () => {
    expect(SLUG_REGEX.test("aB34_6")).toBe(false);
    expect(SLUG_REGEX.test("aB34-6")).toBe(false);
  });

  it("rejects slug with lowercase l (ambiguous char)", () => {
    expect(SLUG_REGEX.test("aB34l6")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(SLUG_REGEX.test("")).toBe(false);
  });
});
