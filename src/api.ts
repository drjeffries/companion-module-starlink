import type ModuleInstance from './main.js'
import type {
	StarlinkAccountResponseV2ServiceResponse,
	StarlinkAddDataBlockRequest,
	StarlinkDataProductsResponse,
	StarlinkEnterpriseCacheSearchRequest,
	StarlinkEnterpriseCacheSearchResponseServiceResponse,
	StarlinkQueryDataUsageRequest,
	StarlinkServiceLineDataUsageForBillingCyclesPaginatedServiceResponse,
	StarlinkServiceLineResponseServiceResponse,
	StarlinkServiceLineSetPublicIpRequest,
	StarlinkServiceResponse,
	StarlinkTokenResponse,
	StarlinkUserTerminalResponseV2PaginatedServiceResponse,
	StarlinkRouterResponseV2ServiceResponse,
} from './starlink-types.js'

/** Discovered from GET https://starlink.com/api/auth/.well-known/openid-configuration */
const TOKEN_URL = 'https://starlink.com/api/auth/connect/token'
/** Matches the `servers` entry ("/api") in the Starlink Public API v2 OpenAPI document. */
const API_BASE_URL = 'https://starlink.com/api'
/** Refresh this many seconds early so an in-flight request never races token expiry. */
const TOKEN_REFRESH_SKEW_SECONDS = 30

export class StarlinkApiError extends Error {
	constructor(
		message: string,
		public readonly status: number,
	) {
		super(message)
		this.name = 'StarlinkApiError'
	}
}

function errMsg(err: unknown): string {
	return err instanceof Error ? err.message : String(err)
}

async function safeText(res: Response): Promise<string> {
	try {
		return await res.text()
	} catch {
		return '<no response body>'
	}
}

function buildQuery(params: Record<string, string | number | boolean | string[] | undefined>): string {
	const search = new URLSearchParams()
	for (const [key, value] of Object.entries(params)) {
		if (value === undefined) continue
		if (Array.isArray(value)) {
			for (const v of value) search.append(key, v)
		} else {
			search.append(key, String(value))
		}
	}
	const qs = search.toString()
	return qs ? `?${qs}` : ''
}

/**
 * Thin client for the Starlink Public API v2 (OIDC client_credentials grant + REST).
 * Handles auto-refresh of the OAuth2 access token; every request transparently retries
 * once after a fresh token if the API returns 401.
 */
export class StarlinkApiClient {
	private accessToken: string | null = null
	private tokenExpiresAtMs = 0
	private tokenRequest: Promise<string> | null = null

	constructor(private readonly self: ModuleInstance) {}

	/** Drop any cached token, e.g. after config changes to clientId/clientSecret. */
	resetToken(): void {
		this.accessToken = null
		this.tokenExpiresAtMs = 0
		this.tokenRequest = null
	}

	private async getAccessToken(forceRefresh = false): Promise<string> {
		if (!forceRefresh && this.accessToken && Date.now() < this.tokenExpiresAtMs) {
			return this.accessToken
		}
		// Coalesce concurrent callers (e.g. several actions firing at once) onto one token request.
		if (!this.tokenRequest) {
			this.tokenRequest = this.fetchNewToken().finally(() => {
				this.tokenRequest = null
			})
		}
		return this.tokenRequest
	}

	private async fetchNewToken(): Promise<string> {
		const clientId = this.self.config.clientId
		const clientSecret = this.self.secrets.clientSecret
		if (!clientId || !clientSecret) {
			throw new StarlinkApiError('Client ID / Client Secret are not configured for this connection', 0)
		}

		const body = new URLSearchParams({
			grant_type: 'client_credentials',
			client_id: clientId,
			client_secret: clientSecret,
		})

		let res: Response
		try {
			res = await fetch(TOKEN_URL, {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body,
			})
		} catch (err) {
			throw new StarlinkApiError(`OIDC token request failed: ${errMsg(err)}`, 0)
		}

		if (!res.ok) {
			const text = await safeText(res)
			throw new StarlinkApiError(`OIDC token request rejected (HTTP ${res.status}): ${text}`, res.status)
		}

		const json = (await res.json()) as StarlinkTokenResponse
		this.accessToken = json.access_token
		this.tokenExpiresAtMs =
			Date.now() + Math.max(json.expires_in - TOKEN_REFRESH_SKEW_SECONDS, TOKEN_REFRESH_SKEW_SECONDS) * 1000
		return this.accessToken
	}

	private async request<T>(
		method: 'GET' | 'POST' | 'PUT' | 'DELETE',
		path: string,
		body?: unknown,
		allowRetry = true,
	): Promise<T> {
		const token = await this.getAccessToken()

		let res: Response
		try {
			res = await fetch(`${API_BASE_URL}${path}`, {
				method,
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json',
					Accept: 'application/json',
				},
				body: body === undefined ? undefined : JSON.stringify(body),
			})
		} catch (err) {
			throw new StarlinkApiError(`Network error calling ${method} ${path}: ${errMsg(err)}`, 0)
		}

		// Access token expired mid-flight (or was revoked) - refresh once and retry transparently.
		if (res.status === 401 && allowRetry) {
			this.resetToken()
			return this.request<T>(method, path, body, false)
		}

		if (!res.ok) {
			const text = await safeText(res)
			throw new StarlinkApiError(`${method} ${path} failed (HTTP ${res.status}): ${text}`, res.status)
		}

		if (res.status === 204) return undefined as T
		const text = await res.text()
		return (text ? JSON.parse(text) : undefined) as T
	}

	async getAccount(): Promise<StarlinkAccountResponseV2ServiceResponse> {
		return this.request('GET', '/public/v2/account')
	}

	async getServiceLine(serviceLineNumber: string): Promise<StarlinkServiceLineResponseServiceResponse> {
		return this.request('GET', `/public/v2/service-lines/${encodeURIComponent(serviceLineNumber)}`)
	}

	async queryDataUsage(
		req: StarlinkQueryDataUsageRequest,
	): Promise<StarlinkServiceLineDataUsageForBillingCyclesPaginatedServiceResponse> {
		return this.request('POST', '/public/v2/data-usage/query', req)
	}

	/** Looks up a single user terminal by ID via the list endpoint (there is no single-resource GET). */
	async findUserTerminal(deviceId: string): Promise<StarlinkUserTerminalResponseV2PaginatedServiceResponse> {
		const qs = buildQuery({ userTerminalIds: [deviceId] })
		return this.request('GET', `/public/v2/user-terminals${qs}`)
	}

	async listUserTerminals(page = 0): Promise<StarlinkUserTerminalResponseV2PaginatedServiceResponse> {
		const qs = buildQuery({ page })
		return this.request('GET', `/public/v2/user-terminals${qs}`)
	}

	async getRouter(routerId: string): Promise<StarlinkRouterResponseV2ServiceResponse> {
		return this.request('GET', `/public/v2/routers/${encodeURIComponent(routerId)}`)
	}

	async listDataProducts(): Promise<StarlinkDataProductsResponse> {
		return this.request('GET', '/public/v2/products')
	}

	/**
	 * Latest cached device health telemetry (latency, obstruction, signal quality, throughput,
	 * public IP, alert flags). Undocumented in the OpenAPI spec - see starlink-types.ts. Requires
	 * the "Device telemetry, View" permission on the service account, separate from the
	 * management-API permissions the rest of this client uses; a 403 here means that permission
	 * is missing, not that the connection is broken.
	 */
	async queryTelemetryCache(
		req: StarlinkEnterpriseCacheSearchRequest,
	): Promise<StarlinkEnterpriseCacheSearchResponseServiceResponse> {
		return this.request('POST', '/public/v2/telemetry/query', req)
	}

	// --- Write operations. Callers (actions.ts) are responsible for the enable-write-actions
	// and safety-interlock (ARMED) checks *before* calling these - this client performs no
	// safety gating of its own, it only talks to the API. ---

	async rebootUserTerminal(deviceId: string): Promise<StarlinkServiceResponse> {
		return this.request('POST', `/public/v2/user-terminals/${encodeURIComponent(deviceId)}/reboot`)
	}

	async rebootRouter(routerId: string): Promise<StarlinkServiceResponse> {
		return this.request('POST', `/public/v2/routers/${encodeURIComponent(routerId)}/reboot`)
	}

	async addDataTopUp(serviceLineNumber: string, req: StarlinkAddDataBlockRequest): Promise<StarlinkServiceResponse> {
		return this.request('POST', `/public/v2/service-lines/${encodeURIComponent(serviceLineNumber)}/data/top-up`, req)
	}

	async setPublicIp(serviceLineNumber: string, publicIp: boolean): Promise<StarlinkServiceResponse> {
		const req: StarlinkServiceLineSetPublicIpRequest = { publicIp }
		return this.request('PUT', `/public/v2/service-lines/${encodeURIComponent(serviceLineNumber)}/public-ip`, req)
	}
}
