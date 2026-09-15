/**
 * Snapshot of the last successful (or failed) telemetry poll. Held on the instance and
 * read by variables.ts / feedbacks.ts so both stay in sync with a single fetch cycle.
 *
 * NOTE on latencyMs / beamReliabilityPercent: the Starlink PUBLIC API v2 (the cloud/OIDC
 * REST API this module talks to) does not expose live RF link telemetry - no ping latency,
 * obstruction percentage, or beam/signal quality for a dish. Those numbers only exist on
 * the dish's own local, unauthenticated gRPC interface on the LAN (typically 192.168.100.1),
 * which is a different protocol entirely and out of scope for a cloud-credentialed module.
 * These fields are kept in the schema (and wired into a variable + feedback) so a future
 * local-telemetry bridge can populate them; until then they stay null and read "N/A".
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

	/** Not available from the Public API v2 - see file header. Always null unless externally bridged. */
	latencyMs: number | null
	/** Not available from the Public API v2 - see file header. Always null unless externally bridged. */
	beamReliabilityPercent: number | null
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
		latencyMs: null,
		beamReliabilityPercent: null,
	}
}
