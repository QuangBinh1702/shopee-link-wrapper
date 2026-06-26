import { AppError, ErrorCodes } from "@/lib/errors";
import { SHORT_DOMAINS } from "./types";

function isShortDomain(hostname: string): boolean {
  return SHORT_DOMAINS.some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
  );
}

export function isShortUrl(input: string): boolean {
  try {
    const url = new URL(input);
    return isShortDomain(url.hostname);
  } catch {
    return false;
  }
}

interface ExpandOptions {
  timeoutMs?: number;
  maxRedirects?: number;
  maxTotalMs?: number;
}

const rawTimeout = process.env.SHORT_URL_EXPAND_TIMEOUT_MS;
const rawMaxRedirects = process.env.SHORT_URL_EXPAND_MAX_REDIRECTS;
const rawMaxTotalMs = process.env.SHORT_URL_EXPAND_MAX_TOTAL_MS;

const DEFAULT_TIMEOUT_MS = rawTimeout ? Number(rawTimeout) : 2000;
const DEFAULT_MAX_REDIRECTS = rawMaxRedirects ? Number(rawMaxRedirects) : 10;
const DEFAULT_MAX_TOTAL_MS = rawMaxTotalMs ? Number(rawMaxTotalMs) : 8000;

export async function expandShortUrl(
  input: string,
  options?: ExpandOptions
): Promise<string> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRedirects = options?.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  const maxTotalMs = options?.maxTotalMs ?? DEFAULT_MAX_TOTAL_MS;
  const visitedUrls = new Set<string>();
  let currentUrl = input;
  const startedAt = Date.now();

  for (let hop = 0; hop <= maxRedirects; hop++) {
    if (Date.now() - startedAt > maxTotalMs) {
      throw new AppError(ErrorCodes.SHORT_URL_EXPAND_FAILED);
    }

    if (visitedUrls.has(currentUrl)) {
      throw new AppError(ErrorCodes.SHORT_URL_EXPAND_FAILED);
    }
    visitedUrls.add(currentUrl);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(currentUrl, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        },
      });

      clearTimeout(timeoutId);

      const location = response.headers.get("location");
      if (!location) {
        if (response.ok || response.status === 404) {
          return currentUrl;
        }
        throw new AppError(ErrorCodes.SHORT_URL_EXPAND_FAILED);
      }

      currentUrl = new URL(location, currentUrl).toString();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof AppError) throw error;
      if ((error as Error)?.name === "AbortError") {
        throw new AppError(ErrorCodes.SHORT_URL_EXPAND_FAILED);
      }
      throw new AppError(ErrorCodes.SHORT_URL_EXPAND_FAILED);
    }
  }

  throw new AppError(ErrorCodes.SHORT_URL_EXPAND_FAILED);
}
