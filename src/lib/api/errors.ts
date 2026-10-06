import type { SerializedError } from "@reduxjs/toolkit";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";

export function isFetchBaseQueryError(error: unknown): error is FetchBaseQueryError {
  return typeof error === "object" && error !== null && "status" in error;
}

export function isSerializedError(error: unknown): error is SerializedError {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  );
}

function messageFromData(data: unknown): string | undefined {
  if (typeof data === "string" && data.length > 0) return data;
  if (typeof data === "object" && data !== null && "message" in data) {
    const message = (data as { message: unknown }).message;
    if (typeof message === "string") return message;
  }
  return undefined;
}

/** Normalises any RTK Query / thrown error into a human readable message. */
export function getErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (isFetchBaseQueryError(error)) {
    if ("error" in error && typeof error.error === "string") return error.error;
    const fromData = "data" in error ? messageFromData(error.data) : undefined;
    if (fromData) return fromData;
    if (typeof error.status === "number") return `Request failed with status ${error.status}.`;
    return fallback;
  }
  if (isSerializedError(error) && error.message) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
