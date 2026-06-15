import { z } from "zod";

/**
 * USGS error handling for the framework-free data layer. Turns raw failures
 * (HTTP error bodies, network drops, schema mismatches) into a single
 * user-facing message — no React / store / MapLibre imports.
 */

/** Thrown when the USGS API responds with a non-OK status. */
export class UsgsRequestError extends Error {
  readonly status?: number;
  /** The original response body, kept for debugging. */
  readonly raw?: string;

  constructor(message: string, options?: { status?: number; raw?: string; cause?: unknown }) {
    super(message, { cause: options?.cause });
    this.name = "UsgsRequestError";
    this.status = options?.status;
    this.raw = options?.raw;
  }
}

/** Lines USGS appends to every plain-text error body — not the actual reason. */
const BOILERPLATE = [
  /^Error\s+\d+:/i, // "Error 400: Bad Request"
  /^Usage details/i,
  /^Request:/i,
  /^Request Submitted:/i,
  /^Service version:/i,
  /^\/fdsnws\//i, // the echoed request path
];

/**
 * Extract a meaningful message from a USGS plain-text error body. The body is a
 * header line, the real reason, then boilerplate; we return the first
 * non-boilerplate line, with a friendlier rephrase of the common
 * too-many-results case.
 */
export function parseUsgsErrorBody(status: number, statusText: string, body: string): string {
  const reason = body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0 && !BOILERPLATE.some((re) => re.test(line)));

  const limit = reason?.match(/(\d+)\s+matching events exceeds search limit of\s+(\d+)/i);
  if (limit) {
    const matched = Number(limit[1]).toLocaleString();
    const cap = Number(limit[2]).toLocaleString();
    return `Too many events match (${matched}). USGS caps results at ${cap} — narrow the date range or raise the minimum magnitude.`;
  }

  return reason || `USGS request failed (${status} ${statusText}).`;
}

/** Map any caught fetch/parse error to a single user-facing message. */
export function toErrorMessage(err: unknown): string {
  if (err instanceof UsgsRequestError) return err.message;
  if (err instanceof z.ZodError) return "USGS returned an unexpected response.";
  // fetch() rejects with a TypeError when the request can't be made at all.
  if (err instanceof TypeError) {
    return "Couldn't reach the USGS service. Check your connection and try again.";
  }
  return err instanceof Error && err.message ? err.message : "Something went wrong. Please try again.";
}
