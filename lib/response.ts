import { NextResponse } from "next/server";
import { AppError } from "./errors";

interface ApiErrorBody {
  code: string;
  message: string;
}

interface ApiSuccessBody<T> {
  [key: string]: unknown;
  data: T;
}

export function successResponse<T>(
  data: T,
  status: number = 200
): NextResponse<ApiSuccessBody<T>> {
  return NextResponse.json({ data }, { status });
}

export function errorResponse(error: AppError): NextResponse<ApiErrorBody> {
  return NextResponse.json(
    {
      code: error.code,
      message: error.message,
    },
    { status: error.httpStatus }
  );
}

export function internalErrorResponse(
  message?: string
): NextResponse<ApiErrorBody> {
  return NextResponse.json(
    {
      code: "INTERNAL_ERROR",
      message: message ?? "Lỗi hệ thống, vui lòng thử lại sau.",
    },
    { status: 500 }
  );
}
