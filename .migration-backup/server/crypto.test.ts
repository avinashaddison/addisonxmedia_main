import { describe, it, expect } from 'vitest';
// We need to set MASTER_KEY before importing crypto module
process.env.MASTER_KEY = 'test-master-key-that-is-at-least-32-chars-long!!';

// Dynamic import after env is set
const { encrypt, decrypt } = await import('./crypto');

describe('crypto', () => {
  it('encrypt/decrypt round-trip produces original plaintext', () => {
    const plaintext = 'my-secret-access-token-12345';
    const ciphertext = encrypt(plaintext);
    expect(ciphertext).not.toBe(plaintext);
    expect(ciphertext.startsWith('v1:')).toBe(true);
    expect(decrypt(ciphertext)).toBe(plaintext);
  });

  it('encrypt produces different output each time (random IV)', () => {
    const plaintext = 'same-input';
    const a = encrypt(plaintext);
    const b = encrypt(plaintext);
    expect(a).not.toBe(b); // Different IVs
    // But both decrypt to same value
    expect(decrypt(a)).toBe(plaintext);
    expect(decrypt(b)).toBe(plaintext);
  });

  it('decrypt of pre-encryption plaintext returns as-is (legacy fallback)', () => {
    const legacy = 'EAABwzLixnjYBO...some-old-token';
    expect(decrypt(legacy)).toBe(legacy);
  });

  it('decrypt of corrupted v1: ciphertext throws', () => {
    expect(() => decrypt('v1:corrupted-not-base64!!!')).toThrow();
    expect(() => decrypt('v1:' + Buffer.from('too-short').toString('base64'))).toThrow();
  });

  it('handles empty string', () => {
    const ct = encrypt('');
    expect(decrypt(ct)).toBe('');
  });

  it('handles unicode content', () => {
    const text = 'Hello 🌍 emoji and दिन्दी';
    const ct = encrypt(text);
    expect(decrypt(ct)).toBe(text);
  });
});
