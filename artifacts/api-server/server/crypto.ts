import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import logger from "./lib/logger";

// AES-256-GCM envelope encryption for sensitive secrets stored in DB
// (currently: Meta access tokens). Algorithm:
//   ciphertext = base64(iv || ciphertextBytes || authTag)
//
// Key derivation: scrypt(MASTER_KEY) with a fixed salt. The MASTER_KEY env var
// is the source of truth — losing it means losing access to every encrypted
// token in the DB. In prod use a managed KMS instead and pass the data key here.

const MASTER_KEY = process.env.MASTER_KEY;
if (!MASTER_KEY || MASTER_KEY.length < 32) {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "[crypto] MASTER_KEY not set or too short (need >=32 chars). " +
        "Cannot start in production without a valid MASTER_KEY. " +
        "Generate one: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\""
    );
  }
  logger.warn(
    "MASTER_KEY not set or too short (need >=32 chars). " +
      "Falling back to a derived dev key -- DO NOT USE IN PRODUCTION.\n" +
      "Generate one: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\""
  );
}

// Salt is fixed (per-deployment) — KDF output stable across restarts so we
// can decrypt previously-encrypted rows. Different salt per row would require
// storing the salt with each ciphertext (also valid; simpler version below).
const KDF_SALT = "addisonx-fixed-salt-v1";
const KEY = scryptSync(MASTER_KEY ?? "dev-fallback-key-do-not-use-in-prod-32+", KDF_SALT, 32);

const TAG = "v1:"; // version prefix so we can rotate/migrate later without breaking old rows

export function encrypt(plaintext: string): string {
  const iv = randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = createCipheriv("aes-256-gcm", KEY, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return TAG + Buffer.concat([iv, enc, authTag]).toString("base64");
}

export function decrypt(ciphertext: string): string {
  if (!ciphertext.startsWith(TAG)) {
    // Plaintext or pre-encryption row. Return as-is so existing data still works.
    // Migration path: re-save (POST /integrations/meta) re-encrypts.
    return ciphertext;
  }
  const buf = Buffer.from(ciphertext.slice(TAG.length), "base64");
  const iv = buf.subarray(0, 12);
  const authTag = buf.subarray(buf.length - 16);
  const enc = buf.subarray(12, buf.length - 16);
  const decipher = createDecipheriv("aes-256-gcm", KEY, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}
