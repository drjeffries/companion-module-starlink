import type { SomeCompanionConfigField } from '@companion-module/base'
import type ModuleInstance from './main.js'

export type ModuleConfig = {
	clientId: string
	serviceLineNumber: string
	deviceId: string
	routerId: string
	pollIntervalSeconds: number
	enableWriteActions: boolean
	disarmTimeoutSeconds: number
}

/** Config fields of type 'secret-text' are routed by Companion into a separate secrets store. */
export type ModuleSecrets = {
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
			type: 'textinput',
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
				'Defaults used by actions/variables/presets when a button does not override them. These dropdowns are populated automatically from your account a few seconds after this connection first authenticates - if you\'re setting this up for the first time, save once with just Client ID/Secret filled in, then reopen this panel. You can also pick "Custom value" in a dropdown to type an ID directly, or press the "List Account Service Lines" / "List User Terminals & Routers" actions (also available as ready-made presets) at any time to refresh this list and log full details.',
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
			type: 'number',
			id: 'pollIntervalSeconds',
			label: 'Telemetry Poll Interval (seconds)',
			width: 6,
			default: 60,
			min: 2,
			max: 3600,
			tooltip:
				"Starlink API v2 rate limit: 250 requests/minute per account, shared across every integration using that account - this module makes ~6 requests per poll (5 management-API calls plus 1 telemetry cache call). 60s is a conservative default with headroom to spare; you can lower it, but Starlink itself recommends syncing to your own database rather than high-frequency polling of the management API, and the live telemetry values only refresh a few times a minute on Starlink's side regardless of how often you poll.",
			description:
				'Starlink API v2 allows 250 requests/minute per account (shared with any other integration on the account); this module uses ~6 requests per poll. Lower this if you want fresher data, but note Starlink recommends against high-frequency polling of the management API.',
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
			id: 'info-safety',
			width: 12,
			label: 'Safety Notice',
			value:
				'When disabled, this module runs strictly READ-ONLY: telemetry, feedbacks and variables stay active, but every write action (top-up, reboot dish, reboot router, set public IP) is blocked and logged as a warning instead of being sent. When enabled, those actions additionally require the connection to be in the ARMED state (see the "Toggle Arm State" action) before anything is sent to Starlink.',
		},
	]
}
