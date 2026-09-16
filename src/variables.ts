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
	obstruction_percent: string
	signal_quality_percent: string
	ping_drop_rate_percent: string
	downlink_mbps: string
	uplink_mbps: string
	terminal_uptime: string
	public_ip_address: string
	alert_obstruction: string
	alert_thermal: string
	alert_pop_change: string
	alert_software_update_pending: string
	alert_data_overage: string
	alert_alignment_issue: string

	router_uptime: string
	router_internet_latency_ms: string
	router_dish_latency_ms: string
	router_clients: string

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

		data_used_gb: { name: 'Priority data used this billing cycle (GB)' },
		data_used_standard_gb: { name: 'Standard (deprioritized) data used this cycle (GB)' },
		data_cap_gb: { name: 'Recurring priority data allotment this cycle (GB)' },
		data_used_percent: { name: 'Percent of recurring data allotment used (plain number, no % sign)' },

		device_id: { name: 'Default user terminal / dish ID' },
		device_nickname: { name: 'User terminal nickname' },
		kit_serial_number: { name: 'Kit serial number' },
		dish_serial_number: { name: 'Dish serial number' },

		router_id: { name: 'Default router ID' },
		router_nickname: { name: 'Router nickname' },

		latency_ms: { name: 'Dish round-trip latency to Starlink PoP, ms (Telemetry API)' },
		obstruction_percent: { name: 'Dish obstruction, % of time, 0-100 (Telemetry API, plain number, no % sign)' },
		signal_quality_percent: { name: 'Dish signal quality, %, 0-100 (Telemetry API, plain number, no % sign)' },
		ping_drop_rate_percent: {
			name: 'Dish ping drop rate to Starlink PoP, %, 0-100 (Telemetry API, plain number, no % sign)',
		},
		downlink_mbps: { name: 'Dish downlink throughput, Mbps (Telemetry API)' },
		uplink_mbps: { name: 'Dish uplink throughput, Mbps (Telemetry API)' },
		terminal_uptime: { name: 'Dish uptime since last reboot (Telemetry API)' },
		public_ip_address: { name: 'Dish public IPv4 address(es) (Telemetry API)' },
		alert_obstruction: { name: 'Alert: frequent obstruction detected (YES / NO)' },
		alert_thermal: { name: 'Alert: power supply thermal throttling (YES / NO)' },
		alert_pop_change: { name: 'Alert: Starlink point-of-presence changed - brief disconnect/IP change (YES / NO)' },
		alert_software_update_pending: { name: 'Alert: software update reboot pending (YES / NO)' },
		alert_data_overage: { name: 'Alert: rate-limited from data overage (YES / NO)' },
		alert_alignment_issue: { name: 'Alert: mast/actuator/alignment issue (YES / NO)' },

		router_uptime: { name: 'Router uptime since last reboot (Telemetry API)' },
		router_internet_latency_ms: { name: 'Router-to-internet latency, ms (Telemetry API)' },
		router_dish_latency_ms: { name: 'Router-to-dish latency, ms (Telemetry API)' },
		router_clients: { name: 'Router connected client count (Telemetry API)' },

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

function uptimeOrNA(seconds: number | null): string {
	if (seconds === null) return 'N/A'
	const days = Math.floor(seconds / 86400)
	const hours = Math.floor((seconds % 86400) / 3600)
	const minutes = Math.floor((seconds % 3600) / 60)
	if (days > 0) return `${days}d ${hours}h`
	if (hours > 0) return `${hours}h ${minutes}m`
	return `${minutes}m`
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

		data_used_gb: numOrNA(t.dataUsedPriorityGB),
		data_used_standard_gb: numOrNA(t.dataUsedStandardGB),
		data_cap_gb: numOrNA(t.dataCapGB),
		data_used_percent: numOrNA(t.dataUsedPercent),

		device_id: t.deviceId ?? self.config.deviceId ?? 'N/A',
		device_nickname: t.deviceNickname ?? 'N/A',
		kit_serial_number: t.kitSerialNumber ?? 'N/A',
		dish_serial_number: t.dishSerialNumber ?? 'N/A',

		router_id: t.routerId ?? self.config.routerId ?? 'N/A',
		router_nickname: t.routerNickname ?? 'N/A',

		latency_ms: numOrNA(t.liveLatencyMs),
		obstruction_percent: numOrNA(t.liveObstructionPercent),
		signal_quality_percent: numOrNA(t.liveSignalQualityPercent),
		ping_drop_rate_percent: numOrNA(t.livePingDropRatePercent),
		downlink_mbps: numOrNA(t.liveDownlinkMbps),
		uplink_mbps: numOrNA(t.liveUplinkMbps),
		terminal_uptime: uptimeOrNA(t.liveUptimeSeconds),
		public_ip_address: t.livePublicIpAddress ?? 'N/A',
		alert_obstruction: yesNo(t.alertObstruction),
		alert_thermal: yesNo(t.alertThermal),
		alert_pop_change: yesNo(t.alertPopChange),
		alert_software_update_pending: yesNo(t.alertSoftwareUpdatePending),
		alert_data_overage: yesNo(t.alertDataOverage),
		alert_alignment_issue: yesNo(t.alertAlignmentIssue),

		router_uptime: uptimeOrNA(t.routerUptimeSeconds),
		router_internet_latency_ms: numOrNA(t.routerInternetLatencyMs),
		router_dish_latency_ms: numOrNA(t.routerDishLatencyMs),
		router_clients: numOrNA(t.routerClients),

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
