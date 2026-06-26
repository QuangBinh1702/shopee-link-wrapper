import { AppError, ErrorCodes } from "@/lib/errors";
import { ParsedShopeeUrl, SHOPEE_DOMAINS } from "./types";

function isPositiveNumeric(value: string): boolean {
  return /^\d+$/.test(value) && value.length > 0;
}

function extractFromPathname(pathname: string): [string, string] | null {
  const lower = pathname.toLowerCase();
  const productMatch = lower.match(/^\/product\/(\d+)\/(\d+)/);
  if (productMatch) {
    return [productMatch[1], productMatch[2]];
  }

  const iMatch = lower.match(/-i\.(\d+)\.(\d+)/);
  if (iMatch) {
    return [iMatch[1], iMatch[2]];
  }

  return null;
}

function extractFromQuery(searchParams: URLSearchParams): [string, string] | null {
  const shopId = searchParams.get("shopid") ?? searchParams.get("shop_id");
  const itemId = searchParams.get("itemid") ?? searchParams.get("item_id");
  if (shopId && itemId && isPositiveNumeric(shopId) && isPositiveNumeric(itemId)) {
    return [shopId, itemId];
  }
  return null;
}

function stripTrackingQuery(searchParams: URLSearchParams): void {
  const trackingKeys = [
    "sp_atk",
    "xptdk",
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
  ];
  for (const key of trackingKeys) {
    searchParams.delete(key);
  }
}

function isShopeeDomain(hostname: string): boolean {
  return SHOPEE_DOMAINS.some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
  );
}

export function parseShopeeUrl(input: string): ParsedShopeeUrl {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new AppError(ErrorCodes.INVALID_URL);
  }

  if (!isShopeeDomain(url.hostname)) {
    throw new AppError(ErrorCodes.UNSUPPORTED_DOMAIN);
  }

  const ids = extractFromPathname(url.pathname) ?? extractFromQuery(url.searchParams);

  if (!ids) {
    throw new AppError(ErrorCodes.PRODUCT_ID_NOT_FOUND);
  }

  const [shopId, itemId] = ids;

  stripTrackingQuery(url.searchParams);

  const canonicalUrl = `https://${SHOPEE_DOMAINS[0]}/product/${shopId}/${itemId}`;

  return {
    shopId,
    itemId,
    originalUrl: input,
    canonicalUrl,
    wasShortUrl: false,
  };
}
