// _shared/telegram.ts
//
// Verifies the `initData` string that Telegram sends to every Mini App.
// This is the ONLY thing standing between "a real Telegram user" and
// "anyone with curl" — every Edge Function that touches player data must
// call this first and reject the request if it fails.
//
// How it works (per Telegram's own spec):
// 1. initData is a query-string like "user=...&auth_date=...&hash=...".
// 2. Remove `hash`, sort the remaining fields, join as "key=value\n" lines.
// 3. secret_key = HMAC_SHA256("WebAppData", BOT_TOKEN)
// 4. expected_hash = HMAC_SHA256(secret_key, data_check_string)
// 5. If expected_hash !== hash, the data was tampered with (or is fake) — reject.
// 6. Also reject if auth_date is too old (the user opened a stale/replayed session).

const encoder = new TextEncoder();

async function hmacSha256(keyBytes: Uint8Array, message: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return new Uint8Array(sig);
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export interface TelegramUser {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface VerifiedInitData {
  user: TelegramUser;
  authDate: number;
}

const MAX_AUTH_AGE_SECONDS = 24 * 60 * 60; // reject sessions older than 24h

export async function verifyTelegramInitData(initData: string, botToken: string): Promise<VerifiedInitData> {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) throw new Error("Missing hash in initData");
  params.delete("hash");

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const secretKey = await hmacSha256(encoder.encode("WebAppData"), botToken);
  const expected = await hmacSha256(secretKey, dataCheckString);
  const expectedHex = bytesToHex(expected);

  if (expectedHex !== hash) {
    throw new Error("Invalid Telegram initData signature");
  }

  const authDate = Number(params.get("auth_date") || "0");
  const ageSeconds = Date.now() / 1000 - authDate;
  if (!authDate || ageSeconds > MAX_AUTH_AGE_SECONDS) {
    throw new Error("Telegram initData has expired — reopen the Mini App");
  }

  const userRaw = params.get("user");
  if (!userRaw) throw new Error("Missing user in initData");
  const user = JSON.parse(userRaw) as TelegramUser;

  return { user, authDate };
}
