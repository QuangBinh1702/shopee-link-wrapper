export interface ParsedShopeeUrl {
  shopId: string;
  itemId: string;
  originalUrl: string;
  canonicalUrl: string;
  wasShortUrl: boolean;
}

export const SHORT_DOMAINS = ["shope.ee", "s.shopee.vn", "shp.ee", "vn.shp.ee"];

export const SHOPEE_DOMAINS = ["shopee.vn"];
