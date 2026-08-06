import { hsalsa, xsalsa20poly1305 } from '@noble/ciphers/salsa.js';
import { x25519 } from '@noble/curves/ed25519.js';
import { blake2b } from '@noble/hashes/blake2.js';

const SIGMA = new TextEncoder().encode('expand 32-byte k');

const u32 = (bytes: Uint8Array) =>
  new Uint32Array(bytes.buffer, bytes.byteOffset, bytes.length >>> 2);

/** crypto_box_beforenm: HSalsa20 поверх общего секрета X25519 */
const getSharedKey = (secretKey: Uint8Array, publicKey: Uint8Array) => {
  const key = new Uint8Array(32);
  hsalsa(u32(SIGMA), u32(x25519.getSharedSecret(secretKey, publicKey)), u32(new Uint8Array(16)), u32(key));
  return key;
};

/**
 * libsodium crypto_box_seal — то, что требует GitHub для Actions secrets.
 * Формат: ephemeralPublicKey (32) || xsalsa20poly1305(ephemeral || recipient nonce)
 */
export const sealedBox = (message: Uint8Array, recipientPublicKey: Uint8Array) => {
  const ephemeralSecretKey = x25519.utils.randomSecretKey();
  const ephemeralPublicKey = x25519.getPublicKey(ephemeralSecretKey);
  const key = getSharedKey(ephemeralSecretKey, recipientPublicKey);
  const nonce = blake2b(Uint8Array.from([...ephemeralPublicKey, ...recipientPublicKey]), {
    dkLen: 24,
  });
  const encrypted = xsalsa20poly1305(key, nonce).encrypt(message);
  return Uint8Array.from([...ephemeralPublicKey, ...encrypted]);
};
