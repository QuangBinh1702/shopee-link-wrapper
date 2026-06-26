export const ErrorCodes = {
  INVALID_URL: "INVALID_URL",
  INVALID_BODY: "INVALID_BODY",
  UNSUPPORTED_DOMAIN: "UNSUPPORTED_DOMAIN",
  PRODUCT_ID_NOT_FOUND: "PRODUCT_ID_NOT_FOUND",
  SHORT_URL_EXPAND_FAILED: "SHORT_URL_EXPAND_FAILED",
  CONFIG_ERROR: "CONFIG_ERROR",
  AFFILIATE_CREATE_FAILED: "AFFILIATE_CREATE_FAILED",
  RATE_LIMITED: "RATE_LIMITED",
  NOT_FOUND: "NOT_FOUND",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

const ErrorMessages: Record<string, string> = {
  [ErrorCodes.INVALID_URL]: "Link không hợp lệ. Vui lòng dán link Shopee.",
  [ErrorCodes.INVALID_BODY]: "Dữ liệu gửi lên không hợp lệ.",
  [ErrorCodes.UNSUPPORTED_DOMAIN]: "Link không phải của Shopee.",
  [ErrorCodes.PRODUCT_ID_NOT_FOUND]: "Không tìm thấy mã sản phẩm trong link.",
  [ErrorCodes.SHORT_URL_EXPAND_FAILED]:
    "Không thể giải mã liên kết rút gọn này, vui lòng kiểm tra lại liên kết sản phẩm.",
  [ErrorCodes.CONFIG_ERROR]:
    "Lỗi cấu hình hệ thống. Vui lòng liên hệ chủ sở hữu tool.",
  [ErrorCodes.AFFILIATE_CREATE_FAILED]:
    "Không thể tạo link tiếp thị, vui lòng thử lại sau.",
  [ErrorCodes.RATE_LIMITED]:
    "Bạn đã gửi quá nhiều yêu cầu, vui lòng thử lại sau.",
  [ErrorCodes.NOT_FOUND]: "Không tìm thấy link.",
  [ErrorCodes.INTERNAL_ERROR]: "Lỗi hệ thống, vui lòng thử lại sau.",
};

const FALLBACK_MESSAGE = "Lỗi hệ thống, vui lòng thử lại sau.";

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly httpStatus: number;

  constructor(code: ErrorCode, httpStatus?: number) {
    super(ErrorMessages[code] ?? FALLBACK_MESSAGE);
    this.name = "AppError";
    this.code = code;
    this.httpStatus = httpStatus ?? statusForCode(code);
  }
}

function statusForCode(code: ErrorCode): number {
  switch (code) {
    case ErrorCodes.INVALID_URL:
    case ErrorCodes.INVALID_BODY:
    case ErrorCodes.UNSUPPORTED_DOMAIN:
    case ErrorCodes.PRODUCT_ID_NOT_FOUND:
      return 400;
    case ErrorCodes.SHORT_URL_EXPAND_FAILED:
      return 422;
    case ErrorCodes.CONFIG_ERROR:
    case ErrorCodes.AFFILIATE_CREATE_FAILED:
      return 502;
    case ErrorCodes.RATE_LIMITED:
      return 429;
    case ErrorCodes.NOT_FOUND:
      return 404;
    case ErrorCodes.INTERNAL_ERROR:
      return 500;
    default:
      return 500;
  }
}
