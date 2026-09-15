import type ModuleInstance from './main.js'

export type VariablesSchema = {
	arm_status: string
	arm_seconds_remaining: string
	write_actions_enabled: string

	account_number: string
	account_name: string
	region_code: string

	service_line_number: string
	service_line_active: string
	service_line_nickname: string
	public_ip_enabled: string
	public_ip_address: string

	data_used_gb: string
	data_used_standard_gb: string
	data_cap_gb: string
	data_used_percent: string

	device_id: string
	device_nickname: string
	kit_serial_number: string
	dish_serial_number: string

	router_id: string
	router_nickname: string

	latency_ms: string
	beam_reliability: string

	connection_status: string
	last_poll_time: string
	last_error: string
}

export function UpdateVariableDefinitions(self: ModuleInstance): void {
	self.setVariableDefinitions({
		arm_status: { name: 'Safety interlock state (ARMED / DISARMED)' },
		arm_seconds_remaining: { name: 'Seconds remaining until auto-disarm' },
		write_actions_enabled: { name: 'Write actions enabled in config (YES / NO)' },

		account_number: { name: 'Starlink account number' },
		account_name: { name: 'Starlink account name' },
		region_code: { name: 'Account region code' },

		service_line_number: { name: 'Default service line number' },
		service_line_active: { name: 'Service line active (YES / NO)' },
		service_line_nickname: { name: 'Service line nickname' },
		public_ip_enabled: { name: 'Dedicated public IP setting enabled (YES / NO)' },
		public_ip_address: { name: 'Active WAN public IP address (not exposed by API - see HELP)' },

		data_used_gb: { name: 'Priority data used this billing cycle (GB)' },
		data_used_standard_gb: { name: 'Standard (deprioritized) data used this cycle (GB)' },
		data_cap_gb: { name: 'Recurring priority data allotment this cycle (GB)' },
		data_used_percent: { name: 'Percent of recurring data allotment used' },

		device_id: { name: 'Default user terminal / dish ID' },
		device_nickname: { name: 'User terminal nickname' },
		kit_serial_number: { name: 'Kit serial number' },
		dish_serial_number: { name: 'Dish serial number' },

		router_id: { name: 'Default router ID' },
		router_nickname: { name: 'Router nickname' },

		latency_ms: { name: 'Round-trip latency, ms (N/A - not exposed by Public API v2)' },
		beam_reliability: { name: 'Beam/signal reliability, % (N/A - not exposed by Public API v2)' },

		connection_status: { name: 'Last poll result (OK / ERROR)' },
		last_poll_time: { name: 'Timestamp of last telemetry poll' },
		last_error: { name: 'Last telemetry poll error, if any' },
	})
}

function yesNo(value: boolean | null): string {
	if (value === null) return 'N/A'
	return value ? 'YES' : 'NO'
}

function numOrNA(value: number | null, suffix = ''): string {
	return value === null ? 'N/A' : `${value}${suffix}`
}

/** Pushes the latest self.telemetry snapshot into Companion variable values. Called after every poll. */
export function pushTelemetryVariables(self: ModuleInstance): void {
	const t = self.telemetry

	self.setVariableValues({
		account_number: t.accountNumber ?? 'N/A',
		account_name: t.accountName ?? 'N/A',
		region_code: t.regionCode ?? 'N/A',

		service_line_number: t.serviceLineNumber ?? self.config.serviceLineNumber ?? 'N/A',
		service_line_active: yesNo(t.serviceLineActive),
		service_line_nickname: t.serviceLineNickname ?? 'N/A',
		public_ip_enabled: yesNo(t.publicIpEnabled),
		// The Public API only reports whether a dedicated public IP is enabled, never the literal
		// address - it is not returned by any endpoint in the v2 spec.
		public_ip_address: 'N/A (not exposed by Starlink API)',

		data_used_gb: numOrNA(t.dataUsedPriorityGB),
		data_used_standard_gb: numOrNA(t.dataUsedStandardGB),
		data_cap_gb: numOrNA(t.dataCapGB),
		data_used_percent: numOrNA(t.dataUsedPercent, '%'),

		device_id: t.deviceId ?? self.config.deviceId ?? 'N/A',
		device_nickname: t.deviceNickname ?? 'N/A',
		kit_serial_number: t.kitSerialNumber ?? 'N/A',
		dish_serial_number: t.dishSerialNumber ?? 'N/A',

		router_id: t.routerId ?? self.config.routerId ?? 'N/A',
		router_nickname: t.routerNickname ?? 'N/A',

		latency_ms: numOrNA(t.latencyMs),
		beam_reliability: numOrNA(t.beamReliabilityPercent, '%'),

		connection_status: t.pollOk ? 'OK' : 'ERROR',
		last_poll_time: t.lastPollIso ?? 'N/A',
		last_error: t.lastError ?? '',
	})
}

/** Pushes config-derived (not polled) variables. Called from init()/configUpdated(). */
export function pushConfigVariables(self: ModuleInstance): void {
	self.setVariableValues({
		write_actions_enabled: self.config.enableWriteActions ? 'YES' : 'NO',
	})
}
