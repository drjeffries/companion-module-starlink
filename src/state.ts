/**
 * Snapshot of the last successful (or failed) telemetry poll. Held on the instance and
 * read by variables.ts / feedbacks.ts so both stay in sync with a single fetch cycle.
 *
 * The Starlink PUBLIC API v2 (the cloud/OIDC REST API this module talks to) is an
 * account-management API - it does not expose live RF link telemetry (ping latency,
 * obstruction, beam/signal quality). Those only exist on the dish's own local,
 * unauthenticated interface on the LAN, a different protocol out of scope for this
 * cloud-credentialed module, so this state intentionally only tracks fields the API
 * actually returns.
 */
export interface TelemetryState {
	pollOk: boolean
	lastPollIso: string | null
	lastError: string | null

	accountNumber: string | null
	accountName: string | null
	regionCode: string | null

	serviceLineNumber: string | null
	serviceLineActive: boolean | null
	serviceLineNickname: string | null
	publicIpEnabled: boolean | null

	dataUsedPriorityGB: number | null
	dataUsedStandardGB: number | null
	dataCapGB: number | null
	dataUsedPercent: number | null

	deviceId: string | null
	deviceNickname: string | null
	kitSerialNumber: string | null
	dishSerialNumber: string | null

	routerId: string | null
	routerNickname: string | null
}

export function createInitialTelemetryState(): TelemetryState {
	return {
		pollOk: false,
		lastPollIso: null,
		lastError: null,
		accountNumber: null,
		accountName: null,
		regionCode: null,
		serviceLineNumber: null,
		serviceLineActive: null,
		serviceLineNickname: null,
		publicIpEnabled: null,
		dataUsedPriorityGB: null,
		dataUsedStandardGB: null,
		dataCapGB: null,
		dataUsedPercent: null,
		deviceId: null,
		deviceNickname: null,
		kitSerialNumber: null,
		dishSerialNumber: null,
		routerId: null,
		routerNickname: null,
	}
}
