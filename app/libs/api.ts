import { NextResponse } from "next/server";
import { z } from "zod";

type ApiErrorCode =
  | "INVALID_JSON"
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "LISTING_NOT_FOUND"
  | "RESERVATION_NOT_FOUND"
  | "INVALID_RESERVATION_STATE"
  | "BOOKING_CONFLICT"
  | "EMAIL_ALREADY_EXISTS"
  | "INTERNAL_ERROR";

export function apiError(
  status: number,
  code: ApiErrorCode,
  message: string,
  issues?: z.core.$ZodIssue[],
) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(issues
          ? {
              issues: issues.map((issue) => ({
                path: issue.path.join("."),
                message: issue.message,
              })),
            }
          : {}),
      },
    },
    { status },
  );
}

export function unauthorized() {
  return apiError(401, "UNAUTHORIZED", "Authentication is required.");
}

export function reservationNotFound() {
  return apiError(404, "RESERVATION_NOT_FOUND", "Reservation was not found.");
}

export async function parseJson<T>(request: Request, schema: z.ZodType<T>) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return {
      success: false as const,
      response: apiError(400, "INVALID_JSON", "Request body must be valid JSON."),
    };
  }

  const result = schema.safeParse(body);

  if (!result.success) {
    return {
      success: false as const,
      response: apiError(
        422,
        "VALIDATION_ERROR",
        "Request body is invalid.",
        result.error.issues,
      ),
    };
  }

  return { success: true as const, data: result.data };
}
