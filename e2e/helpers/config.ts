/**
 * Shared test credentials and configuration.
 *
 * Values come from `.env.e2e` (loaded by the Playwright configs) or from the
 * CI environment. Credentials deliberately have NO fallbacks: a missing value
 * must fail loudly instead of silently logging in with a guessed account.
 */
export const TEST_CONFIG = {
  baseURL:    process.env.E2E_BASE_URL      || 'https://uat-demo.vacaturetovenaar.nl',
  username:   process.env.E2E_USERNAME      || '',
  password:   process.env.E2E_PASSWORD      || '',
  totpSecret: process.env.E2E_TOTP_SECRET   || '',  // Base32-encoded TOTP secret for 2FA
  backendURL: process.env.E2E_BACKEND_URL   || 'https://uat-api.vacaturetovenaar.nl',
};
