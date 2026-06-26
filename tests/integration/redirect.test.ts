import { describe, it, expect, vi, beforeEach } from "vitest";
import { SLUG_ALPHABET, SLUG_LENGTH } from "@/lib/slug";

vi.mock("@/lib/db/mongodb", () => ({
  connectDb: vi.fn().mockResolvedValue(undefined),
}));

const mockFindOne = vi.fn();
const mockUpdateOne = vi.fn();

vi.mock("@/lib/db/models/link-map", () => ({
  LinkMap: {
    findOne: (...args: unknown[]) => mockFindOne(...args),
    updateOne: (...args: unknown[]) => mockUpdateOne(...args),
  },
}));

function makeValidSlug(): string {
  let slug = "";
  for (let i = 0; i < SLUG_LENGTH; i++) {
    slug += SLUG_ALPHABET[i % SLUG_ALPHABET.length];
  }
  return slug;
}

describe("redirect flow - logic only (no HTTP)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("looks up slug in DB and returns target URL", async () => {
    const slug = makeValidSlug();
    const targetUrl = "https://shopee.vn/product/123.456";

    const { connectDb } = await import("@/lib/db/mongodb");
    const { LinkMap } = await import("@/lib/db/models/link-map");

    mockFindOne.mockResolvedValue({
      slug,
      affiliateUrl: targetUrl,
    });
    mockUpdateOne.mockResolvedValue({ acknowledged: true });

    await connectDb();
    const linkMap = await LinkMap.findOne({ slug });

    expect(linkMap).not.toBeNull();
    expect(linkMap!.affiliateUrl).toBe(targetUrl);
    expect(connectDb).toHaveBeenCalledTimes(1);
  });

  it("returns null for unknown slug", async () => {
    const { LinkMap } = await import("@/lib/db/models/link-map");
    mockFindOne.mockResolvedValue(null);

    const linkMap = await LinkMap.findOne({ slug: "ZZZZZZ" });
    expect(linkMap).toBeNull();
  });

  it("increments clicks atomically on redirect", async () => {
    const slug = makeValidSlug();
    const { LinkMap } = await import("@/lib/db/models/link-map");

    mockUpdateOne.mockResolvedValue({ acknowledged: true });

    const result = await LinkMap.updateOne(
      { slug },
      { $inc: { clicks: 1 }, $set: { lastClickedAt: new Date() } }
    );

    expect(result.acknowledged).toBe(true);
    expect(mockUpdateOne).toHaveBeenCalledWith(
      { slug },
      expect.objectContaining({
        $inc: { clicks: 1 },
        $set: expect.objectContaining({ lastClickedAt: expect.any(Date) }),
      })
    );
  });
});
