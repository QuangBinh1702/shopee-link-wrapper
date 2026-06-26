import { NextRequest } from "next/server";
import { z } from "zod";
import { AppError, ErrorCodes } from "@/lib/errors";
import { successResponse, errorResponse } from "@/lib/response";
import { normalizeShopeeUrl } from "@/lib/shopee/normalize";
import { createAffiliateLink, AffiliateCreateError } from "@/lib/accesstrade/create-affiliate-link";
import { AccessTradeAuthError } from "@/lib/accesstrade/client";
import { createUniqueSlug } from "@/lib/slug";
import { checkRateLimit } from "@/lib/rate-limit";
import { connectDb } from "@/lib/db/mongodb";
import { LinkMap } from "@/lib/db/models/link-map";

const wrapSchema = z.object({
  url: z.string().min(1).max(2048),
});

export async function POST(request: NextRequest) {
  try {
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "127.0.0.1";

    if (!checkRateLimit(clientIp)) {
      return errorResponse(new AppError(ErrorCodes.RATE_LIMITED));
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse(new AppError(ErrorCodes.INVALID_BODY));
    }

    const parsed = wrapSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(new AppError(ErrorCodes.INVALID_BODY));
    }

    const { url } = parsed.data;

    const normalized = await normalizeShopeeUrl(url);

    let affiliateUrl: string;
    try {
      affiliateUrl = await createAffiliateLink(normalized.canonicalUrl);
    } catch (error) {
      if (error instanceof AccessTradeAuthError) {
        return errorResponse(new AppError(ErrorCodes.CONFIG_ERROR));
      }
      if (error instanceof AffiliateCreateError) {
        return errorResponse(new AppError(ErrorCodes.AFFILIATE_CREATE_FAILED));
      }
      affiliateUrl = normalized.canonicalUrl;
    }

    await connectDb();

    const slug = await createUniqueSlug(async (s) => {
      try {
        const existing = await LinkMap.findOne({ slug: s });
        return !!existing;
      } catch {
        return false;
      }
    });
    await LinkMap.create({
      slug,
      shopId: normalized.shopId,
      itemId: normalized.itemId,
      canonicalUrl: normalized.canonicalUrl,
      affiliateUrl,
      source: "web",
      sub1: process.env.DEFAULT_SUB1 || "web_anonymous",
    });

    const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
    const shortUrl = `${baseUrl}/${slug}/shopee`;

    return successResponse({ shortUrl, slug, clicks: 0 });
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error);
    }
    console.error("POST /api/wrap error:", error);
    return errorResponse(new AppError(ErrorCodes.INTERNAL_ERROR));
  }
}
