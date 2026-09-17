import { InstanceStatus } from '@companion-module/base'
import type ModuleInstance from './main.js'
import { StarlinkApiError } from './api.js'
import { pushTelemetryVariables } from './variables.js'

function round2(n: number): number {
	return Math.round(n * 100) / 100
}

function roundOrNull(n: number | null | undefined): number | null {
	return n === null || n === undefined ? null : round2(n)
}

function percentOrNull(fraction: number | null | undefined): number | null {
	return fraction === null || fraction === undefined ? null : round2(fraction * 100)
}

/** Combines several nullable alert flags: true if any is true, null if all are unknown, else false. */
function anyAlert(...flags: (boolean | null | undefined)[]): boolean | null {
	if (flags.some((f) => f === true)) return true
	if (flags.every((f) => f === null || f === undefined)) return null
	return false
}

/**
 * Sums the current billing cycle's recurring data-block allotment (in GB) for the plan cap,
 * used to compute the 80%/95% usage feedback thresholds. Returns null if the plan has no
 * fixed recurring allotment (e.g. unlimited/metered plans), since a percentage is meaningless there.
 */
function sumRecurringAllotmentGB(
	blocks: { dataAmount: number; count: number; dataUnitType: string | null }[] | null | undefined,
): number | null {
	if (!blocks || blocks.length === 0) return null
	let total = 0
	for (const block of blocks) {
		// Public API currently only issues these blocks in GB; skip anything else rather than mis-scale it.
		if (block.dataUnitType && block.dataUnitType.toUpperCase() !== 'GB') continue
		total += block.dataAmount * block.count
	}
	return total > 0 ? round2(total) : null
}

/**
 * Polls the management-API endpoints (account, service line, data usage, user terminal, router
 * identity) - everything except live RF telemetry. Runs on its own timer (Telemetry Poll Interval)
 * separate from pollTelemetryCacheOnce() below, since these change far slower than throughput/signal.
 */
export async function pollManagementOnce(self: ModuleInstance): Promise<void> {
	const { serviceLineNumber, deviceId, routerId } = self.config
	const errors: string[] = []
	const telemetry = self.telemetry

	try {
		const accountRes = await self.api.getAccount()
		const account = accountRes.content
		telemetry.accountNumber = account?.accountNumber ?? null
		telemetry.accountName = account?.accountName ?? null
		telemetry.regionCode = account?.regionCode ?? null
	} catch (err) {
		errors.push(describeError('account', err))
	}

	if (serviceLineNumber) {
		try {
			const slRes = await self.api.getServiceLine(serviceLineNumber)
			const sl = slRes.content
			telemetry.serviceLineNumber = sl?.serviceLineNumber ?? serviceLineNumber
			telemetry.serviceLineActive = sl?.active ?? null
			telemetry.serviceLineNickname = sl?.nickname ?? null
			telemetry.publicIpEnabled = sl?.publicIp ?? null
			telemetry.dataCapGB = sumRecurringAllotmentGB(sl?.dataBlocks?.recurringBlocksCurrentBillingCycle)
		} catch (err) {
			errors.push(describeError('service line', err))
		}

		try {
			const usageRes = await self.api.queryDataUsage({
				serviceLineNumbers: [serviceLineNumber],
				previousBillingCycles: 0,
			})
			const line = usageRes.content?.results?.[0]
			// billingCycles is chronological, most recent (current) cycle is last.
			const currentCycle = line?.billingCycles?.[line.billingCycles.length - 1]
			telemetry.dataUsedPriorityGB = currentCycle ? round2(currentCycle.totalPriorityGB) : null
			telemetry.dataUsedStandardGB = currentCycle ? round2(currentCycle.totalStandardGB) : null
			telemetry.dataUsedPercent =
				telemetry.dataUsedPriorityGB !== null && telemetry.dataCapGB
					? round2((telemetry.dataUsedPriorityGB / telemetry.dataCapGB) * 100)
					: null
		} catch (err) {
			errors.push(describeError('data usage', err))
		}
	}

	if (deviceId) {
		try {
			const terminalRes = await self.api.findUserTerminal(deviceId)
			const terminal = terminalRes.content?.results?.[0]
			telemetry.deviceId = terminal?.userTerminalId ?? deviceId
			telemetry.deviceNickname = terminal?.nickname ?? null
			telemetry.kitSerialNumber = terminal?.kitSerialNumber ?? null
			telemetry.dishSerialNumber = terminal?.dishSerialNumber ?? null
		} catch (err) {
			errors.push(describeError('user terminal', err))
		}
	}

	if (routerId) {
		try {
			const routerRes = await self.api.getRouter(routerId)
			const router = routerRes.content
			telemetry.routerId = router?.routerId ?? routerId
			telemetry.routerNickname = router?.nickname ?? null
		} catch (err) {
			errors.push(describeError('router', err))
		}
	}

	telemetry.lastPollIso = new Date().toISOString()
	telemetry.pollOk = errors.length === 0
	telemetry.lastError = errors.length > 0 ? errors.join(' | ') : null

	pushTelemetryVariables(self)
	self.checkFeedbacks('data_usage_warning', 'data_usage_critical', 'terminal_status_ok', 'terminal_status_fault')

	if (errors.length > 0) {
		self.log('warn', `Telemetry poll completed with errors: ${telemetry.lastError}`)
		self.updateStatus(InstanceStatus.UnknownWarning, telemetry.lastError ?? undefined)
	} else {
		self.updateStatus(InstanceStatus.Ok)
	}
}

/**
 * Polls the live RF telemetry (Telemetry Cache API) - throughput, latency, obstruction, signal
 * quality, public IP and the alert flags. Runs on its own, typically much faster, timer than
 * pollManagementOnce() above, since throughput/signal are what people actually want to watch live.
 */
export async function pollTelemetryCacheOnce(self: ModuleInstance): Promise<void> {
	const { deviceId, routerId } = self.config
	const telemetry = self.telemetry

	if (!deviceId && !routerId) return

	try {
		const cacheRes = await self.api.queryTelemetryCache({
			includeUserTerminals: !!deviceId,
			userTerminalIds: deviceId ? [deviceId] : undefined,
			includeRouters: !!routerId,
			routerIds: routerId ? [routerId] : undefined,
		})

		const ut = deviceId ? cacheRes.content?.userTerminals?.[deviceId] : undefined
		telemetry.liveLatencyMs = roundOrNull(ut?.popPingLatencyMsAvg)
		telemetry.liveObstructionPercent = roundOrNull(ut?.obstructionPercentTime)
		telemetry.liveSignalQualityPercent = percentOrNull(ut?.signalQuality)
		telemetry.livePingDropRatePercent = percentOrNull(ut?.popPingDropRateAvg)
		telemetry.liveDownlinkMbps = roundOrNull(ut?.downlinkThroughputMbps)
		telemetry.liveUplinkMbps = roundOrNull(ut?.uplinkThroughputMbps)
		telemetry.liveUptimeSeconds = ut?.uptimeSeconds ?? null
		telemetry.livePublicIpAddress = ut?.ipAllocations?.ipv4?.length ? ut.ipAllocations.ipv4.join(', ') : null
		telemetry.alertObstruction = anyAlert(ut?.alertHighTimeObstruction)
		telemetry.alertThermal = anyAlert(ut?.alertPsuOtpThrottling)
		telemetry.alertPopChange = anyAlert(ut?.alertPopChange)
		telemetry.alertSoftwareUpdatePending = anyAlert(ut?.alertSoftwareUpdateRebootPending)
		telemetry.alertDataOverage = anyAlert(ut?.alertDataOverageRateLimited)
		telemetry.alertAlignmentIssue = anyAlert(
			ut?.alertMastNotVertical,
			ut?.alertActuatorMotorStuck,
			ut?.alertUnableToAlign,
		)

		const rt = routerId ? cacheRes.content?.routers?.[routerId] : undefined
		telemetry.routerUptimeSeconds = rt?.uptimeSeconds ?? null
		telemetry.routerInternetLatencyMs = roundOrNull(rt?.internetPingLatencyMs)
		telemetry.routerDishLatencyMs = roundOrNull(rt?.dishPingLatencyMs)
		telemetry.routerClients = rt?.clients ?? null

		telemetry.telemetryPollOk = true
		telemetry.telemetryLastError = null
	} catch (err) {
		// A 403 here almost always means the service account is missing the "Device telemetry,
		// View" permission - the management poll (account/service-line/data usage) is unaffected.
		telemetry.telemetryPollOk = false
		telemetry.telemetryLastError = describeError('live telemetry', err)
		self.log('warn', `Live telemetry poll failed: ${telemetry.telemetryLastError}`)
	}

	telemetry.telemetryLastPollIso = new Date().toISOString()

	pushTelemetryVariables(self)
	self.checkFeedbacks(
		'high_latency_alert',
		'obstruction_alert',
		'thermal_alert',
		'pop_change_alert',
		'data_overage_alert',
		'alignment_alert',
	)
}

function describeError(what: string, err: unknown): string {
	if (err instanceof StarlinkApiError) return `${what}: ${err.message}`
	return `${what}: ${err instanceof Error ? err.message : String(err)}`
}

export function startPolling(self: ModuleInstance): void {
	stopPolling(self)

	const managementIntervalMs = Math.max(2, self.config.pollIntervalSeconds || 10) * 1000
	void pollManagementOnce(self)
	self.pollTimer = setInterval(() => {
		void pollManagementOnce(self)
	}, managementIntervalMs)

	const telemetryIntervalMs = Math.max(2, self.config.telemetryPollIntervalSeconds || 15) * 1000
	void pollTelemetryCacheOnce(self)
	self.telemetryPollTimer = setInterval(() => {
		void pollTelemetryCacheOnce(self)
	}, telemetryIntervalMs)
}

export function stopPolling(self: ModuleInstance): void {
	if (self.pollTimer) {
		clearInterval(self.pollTimer)
		self.pollTimer = null
	}
	if (self.telemetryPollTimer) {
		clearInterval(self.telemetryPollTimer)
		self.telemetryPollTimer = null
	}
}
