import { AppError, ErrorCodes } from "@/lib/errors";

const ACCESS_TRADE_API_BASE_URL =
  process.env.ACCESS_TRADE_API_BASE_URL || "https://api.accesstrade.vn";

export async function accessTradeGet<T>(
  path: string,
  params?: Record<string, string>
): Promise<T> {
  const token = process.env.ACCESS_TRADE_TOKEN;
  if (!token) {
    throw new AppError(ErrorCodes.CONFIG_ERROR);
  }

  const url = new URL(`${ACCESS_TRADE_API_BASE_URL}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new AccessTradeAuthError();
    }
    throw new AccessTradeHttpError(response.status, await response.text());
  }

  try {
    return await response.json();
  } catch {
    throw new AppError(ErrorCodes.INTERNAL_ERROR);
  }
}

export async function accessTradePost<T>(
  path: string,
  body: Record<string, unknown>
): Promise<T> {
  const token = process.env.ACCESS_TRADE_TOKEN;
  if (!token) {
    throw new AppError(ErrorCodes.CONFIG_ERROR);
  }

  const response = await fetch(`${ACCESS_TRADE_API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new AccessTradeAuthError();
    }
    throw new AccessTradeHttpError(response.status, await response.text());
  }

  try {
    return await response.json();
  } catch {
    throw new AppError(ErrorCodes.INTERNAL_ERROR);
  }
}

export class AccessTradeAuthError extends Error {
  constructor() {
    super("AccessTrade token hoặc campaign không hợp lệ");
    this.name = "AccessTradeAuthError";
  }
}

export class AccessTradeHttpError extends Error {
  public status: number;

  constructor(status: number, body: string) {
    super(`AccessTrade HTTP ${status}: ${body.slice(0, 100)}`);
    this.name = "AccessTradeHttpError";
    this.status = status;
  }
}
