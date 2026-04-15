/**
 * Shared test credentials and configuration.
 * All test specs should import from here — do NOT hardcode credentials inline.
 * Values are read from .env.e2e via process.env, with safe fallbacks.
 */
export const TEST_CONFIG = {
  baseURL:  process.env.E2E_BASE_URL     || 'https://uat-demo.vacaturetovenaar.nl',
  username: process.env.E2E_USERNAME     || 'shlok@example.com',
  password: process.env.E2E_PASSWORD     || 'demo1234',
  backendURL: process.env.E2E_BACKEND_URL || 'https://uat-api.vacaturetovenaar.nl',
};
