/** Unguessable record token: payload.signature, both base64url. */
export const CAPABILITY_TOKEN_PATTERN = /^[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{16,}$/;

export function isCapabilityToken(value: string | undefined | null): value is string {
  return typeof value === "string" && CAPABILITY_TOKEN_PATTERN.test(value);
}
