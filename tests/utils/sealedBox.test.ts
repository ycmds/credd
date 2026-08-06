import * as assert from 'node:assert';
import { describe, test } from 'node:test';
import { hsalsa, xsalsa20poly1305 } from '@noble/ciphers/salsa.js';
import { x25519 } from '@noble/curves/ed25519.js';
import { blake2b } from '@noble/hashes/blake2.js';
import { sealedBox } from '../../src/utils/sealedBox.js';

// эталон сгенерирован настоящим libsodium (crypto_box_keypair + crypto_box_seal)
const vector = {
  publicKey: 'oJDx3BLI6ezkqYVpgk63y4xbE2V/hlEarWBssMk0viA=',
  privateKey: 'wgyCMPAvAiAgAoCyogBlQs0gyXHxR4PpW0Idxh6YYJ8=',
  message: 'super-secret-value-42',
  sealed: 'bwsjHhOa/W/d/JZjBBgdKBMNGE/D38NFv3bY9j9RoCzkCuQVyXHePw6McI3yvyD/tUnju/SebodiioOU2UyUiVPkFuzf',
};

const fromBase64 = (value: string) => new Uint8Array(Buffer.from(value, 'base64'));

const SIGMA = new TextEncoder().encode('expand 32-byte k');
const u32 = (bytes: Uint8Array) =>
  new Uint32Array(bytes.buffer, bytes.byteOffset, bytes.length >>> 2);

/** обратная к sealedBox операция — есть только в тестах, GitHub умеет расшифровывать сам */
const sealedBoxOpen = (sealed: Uint8Array, publicKey: Uint8Array, privateKey: Uint8Array) => {
  const ephemeralPublicKey = sealed.subarray(0, 32);
  const key = new Uint8Array(32);
  hsalsa(
    u32(SIGMA),
    u32(x25519.getSharedSecret(privateKey, ephemeralPublicKey)),
    u32(new Uint8Array(16)),
    u32(key),
  );
  const nonce = blake2b(Uint8Array.from([...ephemeralPublicKey, ...publicKey]), { dkLen: 24 });
  return xsalsa20poly1305(key, nonce).decrypt(sealed.subarray(32));
};

describe('sealedBox - libsodium crypto_box_seal для GitHub Actions secrets', () => {
  test('should decrypt a ciphertext produced by libsodium', () => {
    const decrypted = sealedBoxOpen(
      fromBase64(vector.sealed),
      fromBase64(vector.publicKey),
      fromBase64(vector.privateKey),
    );
    assert.strictEqual(new TextDecoder().decode(decrypted), vector.message);
  });

  test('should produce a ciphertext decryptable with the recipient key', () => {
    const message = new TextEncoder().encode(vector.message);
    const sealed = sealedBox(message, fromBase64(vector.publicKey));
    const decrypted = sealedBoxOpen(
      sealed,
      fromBase64(vector.publicKey),
      fromBase64(vector.privateKey),
    );
    assert.strictEqual(new TextDecoder().decode(decrypted), vector.message);
  });

  test('should prepend the ephemeral public key and a poly1305 tag', () => {
    const message = new TextEncoder().encode(vector.message);
    const sealed = sealedBox(message, fromBase64(vector.publicKey));
    assert.strictEqual(sealed.length, 32 + message.length + 16);
  });

  test('should be randomized - same input gives different ciphertexts', () => {
    const message = new TextEncoder().encode(vector.message);
    const publicKey = fromBase64(vector.publicKey);
    const first = Buffer.from(sealedBox(message, publicKey)).toString('base64');
    const second = Buffer.from(sealedBox(message, publicKey)).toString('base64');
    assert.notStrictEqual(first, second);
  });
});
