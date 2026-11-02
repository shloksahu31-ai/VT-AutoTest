// TEMPORARY diagnostic — prints a TOTP for a FIXED past timestamp so the
// secret can be compared between CI and a local machine without leaking a
// usable code. Delete this file and diag-totp.yml after use.
const crypto = require('crypto');

function b32decode(input) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const s = String(input || '')
    .replace(/=+$/, '')
    .toUpperCase()
    .replace(/\s+/g, '');
  let bits = 0;
  let buffer = 0;
  const out = [];
  for (const ch of s) {
    const v = alphabet.indexOf(ch);
    if (v < 0) continue;
    buffer = (buffer << 5) | v;
    bits += 5;
    if (bits >= 8) {
      out.push((buffer >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

function totp(secret, tsMs) {
  const counter = Math.floor(tsMs / 1000);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const h = crypto.createHmac('sha1', b32decode(secret)).update(buf).digest();
  const o = h[h.length - 1] & 0xf;
  const n =
    ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 1000000).padStart(6, '0');
}

const secret = process.env.E2E_TOTP_SECRET || '';
console.log(`secret_present=${secret.length > 0}`);
console.log(`secret_length=${secret.length}`);
console.log(`fixed_1700000000=${totp(secret, 1700000000000)}`);
console.log(`fixed_1700000030=${totp(secret, 1700000030000)}`);
