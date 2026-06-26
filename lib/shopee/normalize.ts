import { AppError, ErrorCodes } from "@/lib/errors";
import { ParsedShopeeUrl } from "./types";
import { parseShopeeUrl } from "./parse-url";
import { isShortUrl, expandShortUrl } from "./expand-short-url";

export async function normalizeShopeeUrl(
  input: string
): Promise<ParsedShopeeUrl> {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new AppError(ErrorCodes.INVALID_URL);
  }

  let resolvedUrl = trimmed;

  if (isShortUrl(trimmed)) {
    resolvedUrl = await expandShortUrl(trimmed);
  }

  const parsed = parseShopeeUrl(resolvedUrl);
  parsed.wasShortUrl = isShortUrl(trimmed);

  return parsed;
}
