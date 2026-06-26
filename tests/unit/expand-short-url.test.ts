import { describe, it, expect, vi, beforeEach } from "vitest";
import { expandShortUrl, isShortUrl } from "@/lib/shopee/expand-short-url";

function mockFetch(response: {
  status?: number;
  location?: string;
  ok?: boolean;
}) {
  return vi.mocked(fetch).mockResolvedValueOnce({
    headers: new Map(
      response.location ? [["location", response.location]] : []
    ) as unknown as Headers,
    ok: response.ok ?? true,
    status: response.status ?? 200,
  } as Response);
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(globalThis, "fetch");
});

describe("isShortUrl", () => {
  it("returns true for shope.ee", () => {
    expect(isShortUrl("https://shope.ee/abc123")).toBe(true);
  });

  it("returns true for s.shopee.vn", () => {
    expect(isShortUrl("https://s.shopee.vn/abc123")).toBe(true);
  });

  it("returns true for shp.ee", () => {
    expect(isShortUrl("https://shp.ee/abc123")).toBe(true);
  });

  it("returns true for vn.shp.ee", () => {
    expect(isShortUrl("https://vn.shp.ee/abc123")).toBe(true);
  });

  it("returns false for shopee.vn", () => {
    expect(isShortUrl("https://shopee.vn/product/123/456")).toBe(false);
  });

  it("returns false for invalid input", () => {
    expect(isShortUrl("not-a-url")).toBe(false);
  });
});

describe("expandShortUrl", () => {
  it("follows 2-hop redirect to Shopee URL", async () => {
    mockFetch({ location: "https://s.shopee.vn/intermediate" });
    mockFetch({ location: "https://shopee.vn/product/123/456" });
    mockFetch({ ok: true });

    const result = await expandShortUrl("https://shope.ee/abc", {
      timeoutMs: 5000,
    });
    expect(result).toBe("https://shopee.vn/product/123/456");
  });

  it("throws SHORT_URL_EXPAND_FAILED on redirect loop", async () => {
    mockFetch({ location: "https://shope.ee/loop" });
    mockFetch({ location: "https://shope.ee/loop" });

    await expect(
      expandShortUrl("https://shope.ee/loop", { timeoutMs: 5000, maxRedirects: 5 })
    ).rejects.toThrow("Không thể giải mã liên kết rút gọn");
  });

  it("throws SHORT_URL_EXPAND_FAILED on timeout", async () => {
    vi.mocked(fetch).mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          setTimeout(() => reject(new DOMException("AbortError", "AbortError")), 100);
        })
    );

    await expect(
      expandShortUrl("https://shope.ee/abc", { timeoutMs: 50 })
    ).rejects.toThrow("Không thể giải mã liên kết rút gọn");
  });

  it("throws SHORT_URL_EXPAND_FAILED on fetch error", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));

    await expect(
      expandShortUrl("https://shope.ee/abc")
    ).rejects.toThrow("Không thể giải mã liên kết rút gọn");
  });

  it("returns URL when there is no location header (end of redirect)", async () => {
    mockFetch({ ok: true });

    const result = await expandShortUrl("https://shope.ee/abc", {
      timeoutMs: 5000,
    });
    expect(result).toBe("https://shope.ee/abc");
  });

  it("stops after maxRedirects hops", async () => {
    for (let i = 0; i <= 3; i++) {
      mockFetch({ location: `https://shope.ee/hop-${i}` });
    }

    await expect(
      expandShortUrl("https://shope.ee/start", { timeoutMs: 5000, maxRedirects: 2 })
    ).rejects.toThrow("Không thể giải mã liên kết rút gọn");
  });
});
