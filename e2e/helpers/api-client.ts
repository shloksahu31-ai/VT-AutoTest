/**
 * Direct API client for E2E test setup/teardown and API-level testing.
 *
 * This bypasses the browser and talks directly to the backend,
 * useful for:
 *  - Health checks
 *  - Creating/cleaning up test data
 *  - API-level intake flow tests
 *
 * IMPORTANT: The backend API is on a SEPARATE domain from the Studio frontend.
 *  - Studio (frontend): https://staging-demo.vacaturetovenaar.nl
 *  - Backend (API):     https://staging-api.vacaturetovenaar.nl
 *
 * AUTH NOTE: The backend uses httpOnly cookies for token storage.
 * The refresh token endpoint requires the cookie, not the JSON body token.
 * We capture Set-Cookie headers from login and replay them for refresh.
 */

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginResult {
  tokens: AuthTokens;
  user: {
    id: number;
    email: string;
    firstName?: string;
    lastName?: string;
    role: string;
  };
  tenant: {
    id: string;
    name: string;
    subdomain: string;
    subscriptionTier: string;
    tenantType: string;
  };
  api_tokens?: {
    is_valid: boolean;
    [key: string]: any;
  };
}

export interface SSEEvent {
  type: string;
  [key: string]: unknown;
}

/**
 * Tenant subdomain extracted from config or URL.
 * Used for X-Tenant-ID header.
 */
function getTenantId(): string {
  if (process.env.E2E_TENANT_ID) {
    return process.env.E2E_TENANT_ID;
  }
  const baseUrl = process.env.E2E_BASE_URL || 'https://staging-demo.vacaturetovenaar.nl';
  try {
    const hostname = new URL(baseUrl).hostname;
    const parts = hostname.split('.');
    if (parts.length >= 3) {
      return parts[0];
    }
  } catch {
    // fall through
  }
  return 'demo';
}

export class ApiClient {
  private backendUrl: string;
  private tenantId: string;
  private tokens: AuthTokens | null = null;
  /** Raw Set-Cookie headers from the backend (for cookie-based auth) */
  private cookies: string[] = [];

  constructor(backendUrl?: string) {
    this.backendUrl = backendUrl || process.env.E2E_BACKEND_URL || 'https://staging-api.vacaturetovenaar.nl';
    this.tenantId = getTenantId();
  }

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    const h: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Tenant-ID': this.tenantId,
      ...extra,
    };
    if (this.tokens?.accessToken) {
      h['Authorization'] = `Bearer ${this.tokens.accessToken}`;
    }
    // Send cookies for endpoints that need them (like refresh-token)
    if (this.cookies.length > 0) {
      const cookieStr = this.cookies
        .map(c => c.split(';')[0]) // Extract just name=value from Set-Cookie
        .join('; ');
      h['Cookie'] = cookieStr;
    }
    return h;
  }

  /**
   * Extract and store cookies from a response's Set-Cookie headers.
   */
  private storeCookies(resp: Response): void {
    const setCookies = resp.headers.getSetCookie?.() || [];
    if (setCookies.length > 0) {
      this.cookies = setCookies;
    }
  }

  // ── Auth ────────────────────────────────────────────────────────────

  async login(email?: string, password?: string): Promise<LoginResult> {
    const resp = await fetch(`${this.backendUrl}/api/auth/login`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        email: email || process.env.E2E_USERNAME,
        password: password || process.env.E2E_PASSWORD,
      }),
    });

    // Store cookies from the login response (httpOnly tokens)
    this.storeCookies(resp);

    const text = await resp.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`Login failed (${resp.status}): Response is not valid JSON. First 200 chars: ${text.slice(0, 200)}`);
    }

    if (!resp.ok) {
      throw new Error(`Login failed (${resp.status}): ${json.message || text.slice(0, 120)}`);
    }

    // Response format: { message, data: { user, tokens, tenant } }
    // On some deployments, it may be returned without the 'data' wrapper.
    const resultData = json.data || json;
    
    if (!resultData.tokens) {
      throw new Error(`Login success (${resp.status}) but MISSING tokens in response. Data keys: ${Object.keys(resultData).join(', ')}`);
    }

    this.tokens = resultData.tokens;
    return resultData as LoginResult;
  }

  async refreshToken(): Promise<void> {
    if (!this.tokens?.refreshToken && this.cookies.length === 0) {
      throw new Error('No refresh token or cookies available');
    }

    // Do NOT send Authorization header — the refresh endpoint uses the
    // refresh token from body/cookie, and sending an expired access token
    // in the Auth header causes the backend to reject the request.
    const refreshHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Tenant-ID': this.tenantId,
    };
    if (this.cookies.length > 0) {
      refreshHeaders['Cookie'] = this.cookies.map(c => c.split(';')[0]).join('; ');
    }

    const resp = await fetch(`${this.backendUrl}/api/auth/refresh-token`, {
      method: 'POST',
      headers: refreshHeaders,
      body: JSON.stringify({
        refreshToken: this.tokens?.refreshToken || '',
      }),
    });

    // Store updated cookies
    this.storeCookies(resp);

    if (!resp.ok) {
      throw new Error(`Token refresh failed (${resp.status})`);
    }

    const json = await resp.json();
    // Response format: { message, data: { accessToken, refreshToken, expiresIn } }
    const data = json.data || json;
    this.tokens = {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken || this.tokens?.refreshToken || '',
      expiresIn: data.expiresIn,
    };
  }

  isAuthenticated(): boolean {
    return !!this.tokens?.accessToken;
  }

  getTokens(): AuthTokens | null {
    return this.tokens;
  }

  // ── Health ──────────────────────────────────────────────────────────

  /**
   * Check if the backend API is reachable.
   * Note: There is no /api/health endpoint on the backend.
   * We check reachability by hitting the login endpoint with empty creds.
   */
  async healthCheck(): Promise<{ ok: boolean; status: number; body?: unknown }> {
    try {
      if (this.tokens?.accessToken) {
        return this.intakeV2Health();
      }
      // Quick reachability check: POST to login with empty body
      const resp = await fetch(`${this.backendUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': this.tenantId },
        body: JSON.stringify({ email: '', password: '' }),
      });
      const body = await resp.json().catch(() => null);
      // Any response (even 400/401) means the backend is reachable
      return { ok: true, status: resp.status, body };
    } catch (err) {
      return { ok: false, status: 0, body: err };
    }
  }

  async intakeV2Health(): Promise<{ ok: boolean; status: number; body?: unknown }> {
    try {
      const resp = await fetch(`${this.backendUrl}/api/intake-v2/health`, {
        method: 'GET',
        headers: this.headers(),
      });
      const body = await resp.json().catch(() => null);
      return { ok: resp.ok, status: resp.status, body };
    } catch (err) {
      return { ok: false, status: 0, body: err };
    }
  }

  // ── Intake V2 ──────────────────────────────────────────────────────

  /**
   * Initialize an intake session.
   * Note: The backend only returns { sessionId }.
   * We construct the full initial state client-side (matching the frontend behavior).
   */
  async initIntakeSession(language: 'nl' | 'en' = 'nl'): Promise<{
    sessionId: string;
    intakeData: Record<string, unknown>;
    gaps: unknown[];
    assumptions: unknown[];
    viabilityScore: number;
    currentStep: string;
  }> {
    const resp = await fetch(`${this.backendUrl}/api/intake-v2/session/init`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ language }),
    });

    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`Init session failed (${resp.status}): ${body}`);
    }

    const json = await resp.json();

    // Backend only returns { sessionId }, so we construct the initial state
    return {
      sessionId: json.sessionId,
      intakeData: json.intakeData || createEmptyIntakeData(),
      gaps: json.gaps || [],
      assumptions: json.assumptions || [],
      viabilityScore: json.viabilityScore ?? 0,
      currentStep: json.currentStep || 'START',
    };
  }

  /**
   * Send a chat message to the intake V2 streaming endpoint.
   * Collects all SSE events and returns them as an array.
   */
  async chatStream(request: {
    message: string;
    sessionId: string;
    currentStep?: string;
    intakeData?: unknown;
    gaps?: unknown[];
    assumptions?: unknown[];
    viabilityScore?: number;
    language?: 'nl' | 'en';
    conversationHistory?: Array<{ role: string; content: string }>;
    [key: string]: unknown;
  }): Promise<{
    events: SSEEvent[];
    chatResponse: string;
    intentAction: string | null;
    dataEvent: SSEEvent | null;
  }> {
    const resp = await fetch(`${this.backendUrl}/api/intake-v2/chat/stream`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(request),
    });

    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`Chat stream failed (${resp.status}): ${body}`);
    }

    return this.parseSSEResponse(resp);
  }

  /**
   * Non-streaming chat endpoint (simpler, for quick tests).
   */
  async chat(request: {
    message: string;
    sessionId: string;
    currentStep?: string;
    intakeData?: unknown;
    language?: 'nl' | 'en';
    [key: string]: unknown;
  }): Promise<unknown> {
    const resp = await fetch(`${this.backendUrl}/api/intake-v2/chat`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(request),
    });

    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`Chat failed (${resp.status}): ${body}`);
    }

    return resp.json();
  }

  // ── SSE Parsing ────────────────────────────────────────────────────

  private async parseSSEResponse(resp: Response): Promise<{
    events: SSEEvent[];
    chatResponse: string;
    intentAction: string | null;
    dataEvent: SSEEvent | null;
  }> {
    const events: SSEEvent[] = [];
    let chatResponse = '';
    let intentAction: string | null = null;
    let dataEvent: SSEEvent | null = null;

    const reader = resp.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        // Handle both "data: {...}" and "data:  {...}" (with extra space)
        const dataMatch = line.match(/^data:\s*(.*)/);
        if (!dataMatch) continue;
        const data = dataMatch[1];
        if (data === '[DONE]') continue;

        try {
          const event = JSON.parse(data) as SSEEvent;
          events.push(event);

          switch (event.type) {
            case 'intent':
              intentAction = event.action as string;
              break;
            case 'chat_chunk':
              chatResponse += event.content as string;
              break;
            case 'data':
              dataEvent = event;
              break;
            case 'error':
              console.warn(`[SSE Error] ${event.error} (${event.code})`);
              break;
          }
        } catch {
          // Ignore malformed SSE events
        }
      }
    }

    return { events, chatResponse, intentAction, dataEvent };
  }

  // ── Vacancy Types ─────────────────────────────────────────────────

  /**
   * Get all available vacancy types for the current tenant.
   * Returns { success, data: VacancyType[], source }.
   */
  async getVacancyTypes(): Promise<{ ok: boolean; status: number; data?: unknown[]; body?: unknown }> {
    try {
      const resp = await fetch(`${this.backendUrl}/api/tenants/vacancy-types`, {
        method: 'GET',
        headers: this.headers(),
      });
      const body = await resp.json().catch(() => null);
      return {
        ok: resp.ok,
        status: resp.status,
        data: body?.data || body?.vacancyTypes || [],
        body,
      };
    } catch (err) {
      return { ok: false, status: 0, body: err };
    }
  }

  // ── Vacancy Sections ───────────────────────────────────────────────

  /**
   * Get vacancy sections config for a specific vacancy type.
   */
  async getVacancySections(vacancyType: string): Promise<{
    ok: boolean;
    status: number;
    vacancyType?: string;
    sections?: unknown[];
    body?: unknown;
  }> {
    try {
      const resp = await fetch(`${this.backendUrl}/api/vacancy-sections/${vacancyType}`, {
        method: 'GET',
        headers: this.headers(),
      });
      const body = await resp.json().catch(() => null);
      return {
        ok: resp.ok,
        status: resp.status,
        vacancyType: body?.vacancyType,
        sections: body?.sections || [],
        body,
      };
    } catch (err) {
      return { ok: false, status: 0, body: err };
    }
  }

  // ── Vacancies CRUD ─────────────────────────────────────────────────

  /**
   * List vacancies with optional filters.
   */
  async listVacancies(options: {
    limit?: number;
    offset?: number;
    status?: string;
    vacancyType?: string;
  } = {}): Promise<{
    ok: boolean;
    status: number;
    vacancies?: unknown[];
    total?: number;
    body?: unknown;
  }> {
    try {
      const params = new URLSearchParams();
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.offset) params.append('offset', options.offset.toString());
      if (options.status) params.append('status', options.status);
      if (options.vacancyType) params.append('vacancyType', options.vacancyType);

      const resp = await fetch(`${this.backendUrl}/api/vacancies?${params.toString()}`, {
        method: 'GET',
        headers: this.headers(),
      });
      const body = await resp.json().catch(() => null);
      const data = body?.data || body;
      return {
        ok: resp.ok,
        status: resp.status,
        vacancies: data?.vacancies || [],
        total: data?.total,
        body,
      };
    } catch (err) {
      return { ok: false, status: 0, body: err };
    }
  }

  /**
   * Create a vacancy.
   */
  async createVacancy(input: {
    title: string;
    vacancyType: string;
    language: string;
    fullText?: string;
    status?: string;
  }): Promise<{ ok: boolean; status: number; vacancy?: unknown; body?: unknown }> {
    try {
      const resp = await fetch(`${this.backendUrl}/api/vacancies`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(input),
      });
      const body = await resp.json().catch(() => null);
      return {
        ok: resp.ok,
        status: resp.status,
        vacancy: body?.data || body,
        body,
      };
    } catch (err) {
      return { ok: false, status: 0, body: err };
    }
  }

  /**
   * Delete a vacancy by ID.
   */
  async deleteVacancy(vacancyId: string): Promise<{ ok: boolean; status: number }> {
    try {
      const resp = await fetch(`${this.backendUrl}/api/vacancies/${vacancyId}`, {
        method: 'DELETE',
        headers: this.headers(),
      });
      return { ok: resp.ok, status: resp.status };
    } catch {
      return { ok: false, status: 0 };
    }
  }

  // ── Vacancy Studio Sessions ────────────────────────────────────────

  /**
   * List vacancy studio sessions.
   */
  async listStudioSessions(options: {
    limit?: number;
    offset?: number;
    status?: string;
  } = {}): Promise<{
    ok: boolean;
    status: number;
    sessions?: unknown[];
    total?: number;
    body?: unknown;
  }> {
    try {
      const params = new URLSearchParams();
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.offset) params.append('offset', options.offset.toString());
      if (options.status) params.append('status', options.status);

      const resp = await fetch(`${this.backendUrl}/api/vacancy-studio/sessions?${params.toString()}`, {
        method: 'GET',
        headers: this.headers(),
      });
      const body = await resp.json().catch(() => null);
      return {
        ok: resp.ok,
        status: resp.status,
        sessions: body?.sessions || [],
        total: body?.total,
        body,
      };
    } catch (err) {
      return { ok: false, status: 0, body: err };
    }
  }
}

/**
 * Create empty intake data structure matching the frontend's createEmptyIntakeDataV2().
 */
function createEmptyIntakeData(): Record<string, unknown> {
  return {
    persona: {
      archetype: null,
      drivers: null,
      frustrations: null,
      barriers: null,
      antiPersona: null,
    },
    job: {
      title: null,
      hook: null,
      growth: null,
      taskSplit: {
        roleFocusType: null,
        executionPercentage: null,
        strategyPercentage: null,
        execution: null,
        strategy: null,
      },
      teamContext: {
        size: null,
        leadership: null,
        culture: null,
      },
    },
    requirements: {
      hardCriteria: [],
      softSkills: [],
      flexibility: {
        remote: null,
        diplomaVsExperience: null,
      },
    },
    hygiene: {
      salary: null,
      hours: null,
      location: null,
      contractType: null,
      perks: null,
      applicationProcess: null,
    },
  };
}

/**
 * Create a pre-authenticated API client.
 * Logs in automatically using env vars.
 */
export async function createAuthenticatedClient(): Promise<ApiClient> {
  const client = new ApiClient();
  await client.login();
  return client;
}
