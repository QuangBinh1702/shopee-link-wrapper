import { accessTradeGet } from "./client";
import { AppError, ErrorCodes } from "@/lib/errors";

interface Campaign {
  id: string;
  name: string;
  merchant: string;
  url: string;
  status: number;
  approval: string;
}

interface CampaignListResponse {
  data: Campaign[];
  total: number;
}

let cachedCampaign: {
  id: string;
  fetchedAt: number;
} | null = null;

let inflightPromise: Promise<string> | null = null;

const CACHE_TTL_MS = 5 * 60 * 1000;

export async function resolveCampaignId(): Promise<string> {
  const configuredId = process.env.ACCESS_TRADE_CAMPAIGN_ID;
  if (configuredId) {
    return configuredId;
  }

  if (cachedCampaign && Date.now() - cachedCampaign.fetchedAt < CACHE_TTL_MS) {
    return cachedCampaign.id;
  }

  if (inflightPromise) {
    return inflightPromise;
  }

  inflightPromise = (async () => {
    try {
      const response = await accessTradeGet<CampaignListResponse>(
        "/v1/campaigns",
        { approval: "successful" }
      );

      const shopeeCampaign = response.data.find(
        (c) =>
          c.status === 1 &&
          (c.merchant?.toLowerCase().includes("shopee") ||
            c.url?.toLowerCase().includes("shopee"))
      );

      if (!shopeeCampaign) {
        throw new AppError(ErrorCodes.CONFIG_ERROR);
      }

      cachedCampaign = { id: shopeeCampaign.id, fetchedAt: Date.now() };
      return shopeeCampaign.id;
    } finally {
      inflightPromise = null;
    }
  })();

  return inflightPromise;
}
