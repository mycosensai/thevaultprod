import { env } from "./env";
import { CAPABILITY_TOKEN_PATTERN } from "../../src/lib/capability-token";

export type CapabilityKind = "outreach" | "expert";

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function bufferSource(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function base64UrlToBytes(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  const padded = value.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat((4 - (value.length % 4)) % 4);
  try {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

async function hmacKey(usage: "sign" | "verify"): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(env.appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    [usage],
  );
}

/** Seal a numeric id so public result links are not enumerable. */
export async function sealRecordId(kind: CapabilityKind, id: number): Promise<string> {
  if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid record id");
  const payload = new TextEncoder().encode(`${kind}:${id}`);
  const key = await hmacKey("sign");
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, bufferSource(payload)));
  return `${bytesToBase64Url(payload)}.${bytesToBase64Url(signature)}`;
}

/**
 * Open a sealed id. Returns null for a sequential id, a bad signature, or
 * a token minted for a different record kind. Does not throw.
 */
export async function openRecordId(kind: CapabilityKind, token: string): Promise<number | null> {
  if (!CAPABILITY_TOKEN_PATTERN.test(token)) return null;
  const dot = token.indexOf(".");
  const payload = base64UrlToBytes(token.slice(0, dot));
  const signature = base64UrlToBytes(token.slice(dot + 1));
  if (!payload || !signature || signature.byteLength === 0) return null;
  const key = await hmacKey("verify");
  const valid = await crypto.subtle.verify("HMAC", key, bufferSource(signature), bufferSource(payload));
  if (!valid) return null;
  const text = new TextDecoder().decode(payload);
  const prefix = `${kind}:`;
  if (!text.startsWith(prefix)) return null;
  const id = Number(text.slice(prefix.length));
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}
