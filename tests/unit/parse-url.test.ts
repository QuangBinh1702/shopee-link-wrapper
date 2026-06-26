import { describe, it, expect } from "vitest";
import { parseShopeeUrl } from "@/lib/shopee/parse-url";

describe("parseShopeeUrl", () => {
  it("extracts from /product/ShopID/ProductID format", () => {
    const result = parseShopeeUrl(
      "https://shopee.vn/product/123/456?sp_atk=abc&xptdk=xyz"
    );
    expect(result.shopId).toBe("123");
    expect(result.itemId).toBe("456");
    expect(result.canonicalUrl).toBe("https://shopee.vn/product/123/456");
    expect(result.wasShortUrl).toBe(false);
  });

  it("extracts from i.ShopID.ProductID format", () => {
    const result = parseShopeeUrl(
      "https://shopee.vn/Ten-san-pham-i.123.456?sp_atk=abc"
    );
    expect(result.shopId).toBe("123");
    expect(result.itemId).toBe("456");
    expect(result.canonicalUrl).toBe("https://shopee.vn/product/123/456");
  });

  it("extracts from query params shopid/itemid", () => {
    const result = parseShopeeUrl(
      "https://shopee.vn/product?shopid=123&itemid=456"
    );
    expect(result.shopId).toBe("123");
    expect(result.itemId).toBe("456");
  });

  it("extracts from query params shop_id/item_id", () => {
    const result = parseShopeeUrl(
      "https://shopee.vn/product?shop_id=123&item_id=456"
    );
    expect(result.shopId).toBe("123");
    expect(result.itemId).toBe("456");
  });

  it("strips tracking query params from canonical URL", () => {
    const result = parseShopeeUrl(
      "https://shopee.vn/product/123/456?sp_atk=abc&xptdk=xyz&utm_source=fb&utm_medium=social&other=keep"
    );
    expect(result.canonicalUrl).toBe("https://shopee.vn/product/123/456");
  });

  it("handles URL-encoded Vietnamese characters without crashing", () => {
    const result = parseShopeeUrl(
      "https://shopee.vn/%E1%BA%A3nh-%C4%91%E1%BA%B9p-i.123.456"
    );
    expect(result.shopId).toBe("123");
    expect(result.itemId).toBe("456");
  });

  it("throws INVALID_URL for empty input", () => {
    expect(() => parseShopeeUrl("not-a-url")).toThrow("Link không hợp lệ");
  });

  it("throws UNSUPPORTED_DOMAIN for non-Shopee domains", () => {
    expect(() =>
      parseShopeeUrl("https://example.com/product/123/456")
    ).toThrow("Link không phải của Shopee");
  });

  it("throws PRODUCT_ID_NOT_FOUND when no product IDs in URL", () => {
    expect(() =>
      parseShopeeUrl("https://shopee.vn/")
    ).toThrow("Không tìm thấy mã sản phẩm");
  });

  it("handles subdomain shopee.vn URLs", () => {
    const result = parseShopeeUrl(
      "https://mall.shopee.vn/product/123/456"
    );
    expect(result.shopId).toBe("123");
    expect(result.itemId).toBe("456");
  });

  it("handles URLs with uppercase domain", () => {
    const result = parseShopeeUrl(
      "https://SHOPEE.VN/PRODUCT/123/456"
    );
    expect(result.shopId).toBe("123");
    expect(result.itemId).toBe("456");
  });
});
