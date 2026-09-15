import type { SomeCompanionConfigField } from '@companion-module/base'

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

export function GetConfigFields(): SomeCompanionConfigField[] {
	return [
		{
			type: 'static-text',
			id: 'info-auth',
			width: 12,
			label: 'Authentication',
			value:
				"Create an API application under Account &gt; API keys on the Starlink Business portal to obtain a Client ID and Client Secret (OIDC client_credentials grant). These credentials are stored by Companion in this connection's configuration and are never logged by this module.",
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
				'Defaults used by actions/variables/presets when a button does not override them. Service Line Numbers look like SL-XXXXXX-XXXXX-XX; User Terminal and Router IDs are found on the Starlink Business admin portal (Devices page) for the dish/router you want this connection to target.',
		},
		{
			type: 'textinput',
			id: 'serviceLineNumber',
			label: 'Default Service Line Number',
			width: 6,
			default: '',
		},
		{
			type: 'textinput',
			id: 'deviceId',
			label: 'Default User Terminal / Dish ID',
			width: 6,
			default: '',
		},
		{
			type: 'textinput',
			id: 'routerId',
			label: 'Default Router ID',
			width: 6,
			default: '',
		},
		{
			type: 'number',
			id: 'pollIntervalSeconds',
			label: 'Telemetry Poll Interval (seconds)',
			width: 6,
			default: 5,
			min: 2,
			max: 3600,
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
