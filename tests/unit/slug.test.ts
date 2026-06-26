import { describe, it, expect } from "vitest";
import { generateSlug, createUniqueSlug } from "@/lib/slug";

describe("generateSlug", () => {
  it("generates a slug of length 6", () => {
    const slug = generateSlug();
    expect(slug).toHaveLength(6);
  });

  it("uses only allowed characters", () => {
    const allowed = /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz]+$/;
    for (let i = 0; i < 100; i++) {
      expect(generateSlug()).toMatch(allowed);
    }
  });

  it("generates unique slugs", () => {
    const slugs = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      slugs.add(generateSlug());
    }
    expect(slugs.size).toBeGreaterThan(990);
  });
});

describe("createUniqueSlug", () => {
  it("returns slug when not taken", async () => {
    const slug = await createUniqueSlug(async () => false);
    expect(slug).toHaveLength(6);
  });

  it("retries when slug is taken", async () => {
    let callCount = 0;
    const isTaken = async () => {
      callCount++;
      return callCount <= 2;
    };
    const slug = await createUniqueSlug(isTaken);
    expect(slug).toHaveLength(6);
    expect(callCount).toBe(3);
  });

  it("throws after max retries", async () => {
    await expect(createUniqueSlug(async () => true)).rejects.toThrow(
      "Không thể tạo slug duy nhất sau 5 lần thử"
    );
  });
});
