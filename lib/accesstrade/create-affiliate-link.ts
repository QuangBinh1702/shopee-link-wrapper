import { accessTradePost, AccessTradeAuthError, AccessTradeHttpError } from "./client";
import { resolveCampaignId } from "./campaigns";
import { AppError, ErrorCodes } from "@/lib/errors";

interface AffiliateLinkResponse {
  success: boolean;
  data: {
    success_link: Array<{
      aff_link: string;
      short_link: string;
      url_origin: string;
    }>;
    error_link: string[];
    suspend_url: string[];
  };
}

export class AffiliateCreateError extends Error {
  constructor(
    message: string,
    public readonly reason: "error_link" | "suspend_url" | "api_error"
  ) {
    super(message);
    this.name = "AffiliateCreateError";
  }
}

export async function createAffiliateLink(
  canonicalUrl: string,
  sub1?: string
): Promise<string> {
  const campaignId = await resolveCampaignId();
  const sub1Value = sub1 || process.env.DEFAULT_SUB1 || "web_anonymous";

  let lastError: Error | null = null;
  const maxRetries = 2;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await accessTradePost<AffiliateLinkResponse>(
        "/v1/product_link/create",
        {
          campaign_id: campaignId,
          urls: [canonicalUrl],
          sub1: sub1Value,
          sub2: "web",
          utm_source: "shopee-link-wrapper",
        }
      );

      if (!response.success) {
        throw new AffiliateCreateError(
          "AccessTrade API trả về lỗi",
          "api_error"
        );
      }

      if (
        response.data.suspend_url &&
        response.data.suspend_url.length > 0
      ) {
        throw new AffiliateCreateError(
          "Link bị tạm ngưng bởi AccessTrade",
          "suspend_url"
        );
      }

      if (
        response.data.error_link &&
        response.data.error_link.length > 0
      ) {
        throw new AffiliateCreateError(
          "Không thể tạo affiliate link cho URL này",
          "error_link"
        );
      }

      const affLink = response.data.success_link[0]?.aff_link;
      if (!affLink) {
        throw new AffiliateCreateError(
          "AccessTrade không trả về affiliate link",
          "api_error"
        );
      }

      return affLink;
    } catch (error) {
      lastError = error as Error;
      if (
        error instanceof AccessTradeAuthError ||
        error instanceof AccessTradeHttpError ||
        (error instanceof AffiliateCreateError &&
          error.reason === "suspend_url")
      ) {
        throw error;
      }
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }
  }

  throw lastError || new AppError(ErrorCodes.AFFILIATE_CREATE_FAILED);
}
