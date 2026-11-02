import * as OTPAuth from 'otpauth';

/**
 * TOTP Helper — generates time-based one-time passwords on the fly.
 * 
 * Usage:
 *   import { generateTOTP, generateFreshTOTP } from './totp';
 *   const code = await generateFreshTOTP();  // e.g. "482917"
 * 
 * The TOTP secret must be set in .env.e2e as E2E_TOTP_SECRET (base32 encoded).
 */

let lastUsedStep = 0;
let serverOffsetMs: number | null = null;

export async function syncServerOffset(): Promise<number> {
  if (serverOffsetMs !== null) return serverOffsetMs;
  try {
    const baseURL = process.env.E2E_BASE_URL || 'https://uat-demo.vacaturetovenaar.nl';
    const res = await fetch(baseURL, { method: 'HEAD' });
    const serverDate = res.headers.get('date');
    if (serverDate) {
      serverOffsetMs = new Date(serverDate).getTime() - Date.now();
      console.log(`[TOTP] Synced with server time. Offset: ${Math.round(serverOffsetMs / 1000)}s`);
      return serverOffsetMs;
    }
  } catch (err) {
    console.warn('[TOTP] Failed to fetch server date header, fallback to local time:', err);
  }
  serverOffsetMs = 0;
  return serverOffsetMs;
}

export function generateTOTP(secret?: string, timestamp?: number): string {
  const totpSecret = secret || process.env.E2E_TOTP_SECRET;
  
  if (!totpSecret) {
    throw new Error(
      '[TOTP] No TOTP secret found. Set E2E_TOTP_SECRET in .env.e2e ' +
      'with the base32-encoded secret from the 2FA setup.'
    );
  }

  const totp = new OTPAuth.TOTP({
    issuer: 'VacatureTovenaar',
    label: 'E2E-Testing',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(totpSecret.replace(/\s+/g, '').toUpperCase()),
  });

  const ts = timestamp ?? (Date.now() + (serverOffsetMs || 0));
  const token = totp.generate({ timestamp: ts });
  console.log(`[TOTP] Generated code: ${token} (valid for ~${30 - (Math.floor(ts / 1000) % 30)}s)`);
  return token;
}

/**
 * Waits until a fresh, unused TOTP window starts, then generates a code.
 * This prevents:
 *  1. Race conditions where a code expires mid-entry (<5s remaining).
 *  2. Anti-replay rejections where the same code is used across rapid consecutive tests.
 */
export async function generateFreshTOTP(secret?: string): Promise<string> {
  const offset = await syncServerOffset();
  const getEffectiveNow = () => Date.now() + offset;

  let currentStep = Math.floor(getEffectiveNow() / 1000 / 30);

  // If this step was already consumed by a prior test in this run, wait for next period
  if (currentStep <= lastUsedStep) {
    const secRemaining = 30 - (Math.floor(getEffectiveNow() / 1000) % 30);
    const waitMs = (secRemaining + 1) * 1000;
    console.log(`[TOTP] Step ${currentStep} was already consumed. Waiting ${waitMs}ms for fresh step...`);
    await new Promise(resolve => setTimeout(resolve, waitMs));
    currentStep = Math.floor(getEffectiveNow() / 1000 / 30);
  }

  // Ensure at least 10 seconds remaining in window
  const secondsIntoWindow = Math.floor(getEffectiveNow() / 1000) % 30;
  const secondsRemaining = 30 - secondsIntoWindow;

  if (secondsRemaining < 10) {
    const waitMs = (secondsRemaining + 1) * 1000;
    console.log(`[TOTP] Only ${secondsRemaining}s left in window. Waiting ${waitMs}ms for fresh window...`);
    await new Promise(resolve => setTimeout(resolve, waitMs));
    currentStep = Math.floor(getEffectiveNow() / 1000 / 30);
  }

  lastUsedStep = currentStep;
  return generateTOTP(secret, getEffectiveNow());
}
