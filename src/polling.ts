import { InstanceStatus } from '@companion-module/base'
import type ModuleInstance from './main.js'
import { StarlinkApiError } from './api.js'
import { pushTelemetryVariables } from './variables.js'

function round2(n: number): number {
	return Math.round(n * 100) / 100
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

export async function pollOnce(self: ModuleInstance): Promise<void> {
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

function describeError(what: string, err: unknown): string {
	if (err instanceof StarlinkApiError) return `${what}: ${err.message}`
	return `${what}: ${err instanceof Error ? err.message : String(err)}`
}

export function startPolling(self: ModuleInstance): void {
	stopPolling(self)
	const intervalMs = Math.max(2, self.config.pollIntervalSeconds || 5) * 1000
	// Fire one immediate poll so variables/feedbacks aren't stale/blank right after (re)config.
	void pollOnce(self)
	self.pollTimer = setInterval(() => {
		void pollOnce(self)
	}, intervalMs)
}

export function stopPolling(self: ModuleInstance): void {
	if (self.pollTimer) {
		clearInterval(self.pollTimer)
		self.pollTimer = null
	}
}
