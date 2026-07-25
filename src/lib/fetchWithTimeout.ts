export class RequestTimeoutError extends Error {}
export class NetworkError extends Error {}

const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * fetch() with a hard timeout. Without this, a stalled connection just hangs
 * indefinitely — the button stays disabled with no error and no confirmation
 * either way. Throws RequestTimeoutError or NetworkError instead of leaving
 * the caller waiting forever.
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new RequestTimeoutError("Request timed out");
    }
    throw new NetworkError("Couldn't reach the server");
  } finally {
    clearTimeout(timeoutId);
  }
}

export function describeFetchError(err: unknown): string {
  if (err instanceof RequestTimeoutError) {
    return "Taking too long — check your connection and try again";
  }
  return "Couldn't reach the server — check your connection and try again";
}
