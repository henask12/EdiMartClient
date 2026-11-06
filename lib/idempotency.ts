/**
 * A fresh Idempotency-Key for one checkout attempt. The API treats a repeated key as "the same
 * sale", so a retry after a dropped connection can never charge the customer twice.
 */
export const newIdempotencyKey = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `k-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
};

/**
 * Whether the same key should be kept for another try. After a definite answer from the server
 * (a 4xx such as "not enough stock") nothing was sold, so the next attempt gets a new key; after
 * a network error or a 5xx we cannot know, so the same key is reused to make the retry safe.
 */
export const shouldRotateKey = (status: number) => status >= 400 && status < 500 && status !== 408;
