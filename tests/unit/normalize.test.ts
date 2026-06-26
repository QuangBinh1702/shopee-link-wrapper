import { describe, it, expect, vi, beforeEach } from "vitest";
import { normalizeShopeeUrl } from "@/lib/shopee/normalize";

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(globalThis, "fetch");
});

describe("normalizeShopeeUrl", () => {
  it("normalizes a direct Shopee URL", async () => {
    const result = await normalizeShopeeUrl(
      "https://shopee.vn/product/123/456?sp_atk=abc"
    );
    expect(result.shopId).toBe("123");
    expect(result.itemId).toBe("456");
    expect(result.wasShortUrl).toBe(false);
    expect(result.canonicalUrl).toBe("https://shopee.vn/product/123/456");
  });

  it("expands short URL then normalizes", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      headers: new Map([["location", "https://shopee.vn/product/123/456"]]) as unknown as Headers,
      ok: true,
      status: 302,
    } as Response);
    vi.mocked(fetch).mockResolvedValueOnce({
      headers: new Map() as unknown as Headers,
      ok: true,
      status: 200,
    } as Response);

    const result = await normalizeShopeeUrl("https://shope.ee/abc");
    expect(result.shopId).toBe("123");
    expect(result.itemId).toBe("456");
    expect(result.wasShortUrl).toBe(true);
  });

  it("throws INVALID_URL for empty string", async () => {
    await expect(normalizeShopeeUrl("")).rejects.toThrow("Link không hợp lệ");
  });

  it("throws INVALID_URL for whitespace-only string", async () => {
    await expect(normalizeShopeeUrl("   ")).rejects.toThrow("Link không hợp lệ");
  });
});
