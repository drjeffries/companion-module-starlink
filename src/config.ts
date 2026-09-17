import type { SomeCompanionConfigField } from '@companion-module/base'
import type ModuleInstance from './main.js'

export type ModuleConfig = {
	serviceLineNumber: string
	deviceId: string
	routerId: string
	pollIntervalSeconds: number
	telemetryPollIntervalSeconds: number
	enableWriteActions: boolean
	disarmTimeoutSeconds: number
	gaugeMaxDownloadMbps: number
	gaugeMaxUploadMbps: number
}

/**
 * Config fields of type 'secret-text' are routed by Companion into a separate secrets store,
 * which Companion's "export without secrets" option omits entirely. Client ID lives here (not
 * in ModuleConfig) specifically so it's excluded from that kind of export alongside Client Secret.
 * Note: Service Line/Terminal/Router IDs stay in ModuleConfig (see GetConfigFields) because they
 * need to be dropdowns populated from the account - secret-text only supports plain text entry.
 * That means those three IDs are NOT covered by "export without secrets" - see HELP.md.
 */
export type ModuleSecrets = {
	clientId: string
	clientSecret: string
}

export function GetConfigFields(self: ModuleInstance): SomeCompanionConfigField[] {
	return [
		{
			type: 'static-text',
			id: 'info-requirements',
			width: 12,
			label: 'Subscription Requirements',
			value:
				"The Starlink Public API is only available to Business/Enterprise-tier accounts (Business, Enterprise, Maritime, Aviation) - it is not available on consumer Residential or Roam plans, regardless of credentials. The Emergency Priority Data Top-Up action additionally requires the target service line to be on a data plan that supports top-ups (a metered/priority plan with a data pool); Starlink will reject the request with an error on plans that don't support it (e.g. some unlimited plans) - this is enforced by Starlink, not this module. Live RF telemetry (latency/obstruction/signal/public IP) needs the Device telemetry (View) permission on the service account - see Authentication below.",
		},
		{
			type: 'static-text',
			id: 'info-auth',
			width: 12,
			label: 'Authentication',
			value:
				"Create an API application under Account &gt; API keys on the Starlink Business portal to obtain a Client ID and Client Secret (OIDC client_credentials grant). These credentials are stored by Companion in this connection's configuration and are never logged by this module. Grant the service account, at minimum: Account information (View), Service plan (View/Edit), Device management (View), Device command and configuration (Edit), and Device telemetry (View) - the last one is required for live latency/obstruction/signal/public-IP data; without it those variables/feedbacks just stay N/A.",
		},
		{
			type: 'secret-text',
			id: 'clientId',
			label: 'Client ID',
			width: 6,
			minLength: 1,
		},
		{
			type: 'secret-text',
			id: 'clientSecret',
			label: 'Client Secret',
			width: 6,
			minLength: 1,
		},
		{
			type: 'static-text',
			id: 'info-ids',
			width: 12,
			label: 'Default Targets',
			value:
				'Defaults used by actions/variables/presets when a button does not override them. These dropdowns are populated automatically from your account a few seconds after this connection first authenticates - if you\'re setting this up for the first time, save once with just Client ID/Secret filled in, then reopen this panel. You can also pick "Custom value" in a dropdown to type an ID directly, or press the "List Account Service Lines" / "List User Terminals & Routers" actions (also available as ready-made presets) at any time to refresh this list and log full details. Note: unlike Client ID/Secret, these three IDs are ordinary config fields (required for the dropdowns to work) and are NOT removed by Companion\'s "export without secrets" option - scrub them manually before sharing an exported connection/page file.',
		},
		{
			type: 'dropdown',
			id: 'serviceLineNumber',
			label: 'Default Service Line Number',
			width: 6,
			choices: self.knownServiceLines,
			default: self.config?.serviceLineNumber ?? '',
			allowCustom: true,
			tooltip: 'Format SL-XXXXXX-XXXXX-XX. Populated from your account - see "Default Targets" above.',
		},
		{
			type: 'dropdown',
			id: 'deviceId',
			label: 'Default User Terminal / Dish ID',
			width: 6,
			choices: self.knownUserTerminals,
			default: self.config?.deviceId ?? '',
			allowCustom: true,
			tooltip:
				'The User Terminal ID (not the kit serial number printed on the box, or the dish serial number on the dish itself). Populated from your account - see "Default Targets" above.',
		},
		{
			type: 'dropdown',
			id: 'routerId',
			label: 'Default Router ID',
			width: 6,
			choices: self.knownRouters,
			default: self.config?.routerId ?? '',
			allowCustom: true,
			tooltip:
				'Populated from your account - see "Default Targets" above. Leave as "(none)" if this dish has no WiFi router bonded to it.',
		},
		{
			type: 'static-text',
			id: 'info-polling',
			width: 12,
			label: 'Starlink API Rate Limits (for reference)',
			value:
				"(1) 250 requests/minute per account, shared across every integration using that account, not just this connection. (2) The OAuth token endpoint allows 1000 authentications per 15 minutes per client IP - this module caches and reuses each token for its full ~15-minute lifetime, so this is essentially never a concern. (3) Starlink's own docs recommend against high-frequency polling of the management API specifically. (4) The Telemetry Cache API's internal refresh cadence isn't published by Starlink - polling much faster than the link's own reporting rate won't necessarily get you fresher numbers, though it's cheap against the rate limit either way. At the defaults below (10s management, 15s telemetry) this module uses roughly 34 requests/minute - well under budget.",
		},
		{
			type: 'number',
			id: 'pollIntervalSeconds',
			label: 'Management Poll Interval (seconds)',
			width: 6,
			default: 10,
			min: 2,
			max: 3600,
			tooltip:
				'How often account/service-line/data-usage/device-identity are polled (up to 5 management-API calls per cycle - see "Starlink API Rate Limits" above). This data changes slowly, but 10s keeps it feeling current without meaningfully touching the 250 req/min budget (5 calls/10s ≈ 30 req/min). See "Live Telemetry Poll Interval" below for the separate, faster-moving throughput/signal poll.',
			description:
				'Slow-changing account/service-line/data-usage info (~30 req/min at the default). See below for throughput/signal.',
		},
		{
			type: 'number',
			id: 'telemetryPollIntervalSeconds',
			label: 'Live Telemetry Poll Interval (seconds)',
			width: 6,
			default: 15,
			min: 2,
			max: 3600,
			tooltip:
				'How often throughput/latency/obstruction/signal/alerts (the Telemetry Cache API - 1 request per cycle) are polled, independent of the Management Poll Interval above. Starlink does not publish how often this cache itself actually refreshes, so going below ~10-15s likely just re-reads the same snapshot rather than getting fresher data - but it costs almost nothing against the 250 req/min account-wide limit, so a low value is safe to try.',
			description:
				'Fast-moving throughput/latency/signal/alerts (~4 req/min at the default). Independent of Management Poll Interval.',
		},
		{
			type: 'number',
			id: 'disarmTimeoutSeconds',
			label: 'Safety Interlock Auto-Disarm Timeout (seconds)',
			width: 6,
			default: 10,
			min: 3,
			max: 120,
		},
		{
			type: 'checkbox',
			id: 'enableWriteActions',
			label: 'Enable Write Actions (top-up, reboot, public IP)',
			width: 6,
			default: false,
		},
		{
			type: 'static-text',
			id: 'info-gauges',
			width: 12,
			label: 'Gauge Presets',
			value:
				"The Download/Upload gauge presets scale against the two fields below. Starlink's API does not expose a hard throughput ceiling for your specific dish hardware/plan, so these are your own expectation of peak speed, not a queried value - set them to whatever your plan/hardware actually tops out at. The defaults are a generic Business/Enterprise ballpark (Starlink publishes typical ranges of roughly 40-220 Mbps down / 8-25 Mbps up for Business plans; Maritime/Aviation/Priority plans can run higher).",
		},
		{
			type: 'number',
			id: 'gaugeMaxDownloadMbps',
			label: 'Expected Peak Download (Mbps)',
			width: 6,
			default: 220,
			min: 1,
			max: 10000,
			tooltip: 'Used only to scale the Download gauge preset - see "Gauge Presets" above.',
		},
		{
			type: 'number',
			id: 'gaugeMaxUploadMbps',
			label: 'Expected Peak Upload (Mbps)',
			width: 6,
			default: 25,
			min: 1,
			max: 10000,
			tooltip: 'Used only to scale the Upload gauge preset - see "Gauge Presets" above.',
		},
		{
			type: 'static-text',
			id: 'info-safety',
			width: 12,
			label: 'Safety Notice',
			value:
				'When disabled, this module runs strictly READ-ONLY: telemetry, feedbacks and variables stay active, but every write action (top-up, reboot dish, reboot router, set public IP) is blocked and logged as a warning instead of being sent. When enabled, those actions additionally require the connection to be in the ARMED state (see the "Toggle Arm State" action) before anything is sent to Starlink.',
		},
	]
}
