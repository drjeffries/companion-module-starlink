/**
 * Snapshot of the last successful (or failed) telemetry poll. Held on the instance and
 * read by variables.ts / feedbacks.ts so both stay in sync with a single fetch cycle.
 *
 * The `live*`/`alert*` fields come from the Starlink Telemetry Cache API
 * (POST /public/v2/telemetry/query), which is undocumented in the OpenAPI spec and requires
 * its own "Device telemetry, View" service-account permission - see api.ts. Everything else
 * comes from the regular management API endpoints.
 */
export interface TelemetryState {
	pollOk: boolean
	lastPollIso: string | null
	lastError: string | null

	// The live telemetry cache (throughput/latency/obstruction/alerts) polls on its own,
	// independent interval from the management-API fields above - see polling.ts.
	telemetryPollOk: boolean
	telemetryLastPollIso: string | null
	telemetryLastError: string | null

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

	// --- Live device telemetry (Telemetry Cache API) - user terminal ---
	liveLatencyMs: number | null
	liveObstructionPercent: number | null
	liveSignalQualityPercent: number | null
	livePingDropRatePercent: number | null
	liveDownlinkMbps: number | null
	liveUplinkMbps: number | null
	liveUptimeSeconds: number | null
	livePublicIpAddress: string | null
	alertObstruction: boolean | null
	alertThermal: boolean | null
	alertPopChange: boolean | null
	alertSoftwareUpdatePending: boolean | null
	alertDataOverage: boolean | null
	alertAlignmentIssue: boolean | null

	// --- Live device telemetry (Telemetry Cache API) - router ---
	routerUptimeSeconds: number | null
	routerInternetLatencyMs: number | null
	routerDishLatencyMs: number | null
	routerClients: number | null
}

export function createInitialTelemetryState(): TelemetryState {
	return {
		pollOk: false,
		lastPollIso: null,
		lastError: null,
		telemetryPollOk: false,
		telemetryLastPollIso: null,
		telemetryLastError: null,
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
		liveLatencyMs: null,
		liveObstructionPercent: null,
		liveSignalQualityPercent: null,
		livePingDropRatePercent: null,
		liveDownlinkMbps: null,
		liveUplinkMbps: null,
		liveUptimeSeconds: null,
		livePublicIpAddress: null,
		alertObstruction: null,
		alertThermal: null,
		alertPopChange: null,
		alertSoftwareUpdatePending: null,
		alertDataOverage: null,
		alertAlignmentIssue: null,
		routerUptimeSeconds: null,
		routerInternetLatencyMs: null,
		routerDishLatencyMs: null,
		routerClients: null,
	}
}
