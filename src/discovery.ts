import type { DropdownChoice } from '@companion-module/base'
import type ModuleInstance from './main.js'
import { StarlinkApiError } from './api.js'

const NONE_CHOICE: DropdownChoice = { id: '', label: '(none)' }

function describeErr(err: unknown): string {
	return err instanceof StarlinkApiError ? err.message : err instanceof Error ? err.message : String(err)
}

/**
 * Fetches every service line on the account and caches it on `self.knownServiceLines` for
 * the "Default Service Line Number" config dropdown. Also backs the "List Account Service
 * Lines (log only)" action - pass verbose=true there to log full details, vs. the quiet
 * background refresh at connection startup.
 */
export async function refreshServiceLines(self: ModuleInstance, verbose = false): Promise<void> {
	try {
		const res = await self.api.listServiceLines()
		const lines = res.content?.results ?? []
		self.knownServiceLines = [
			NONE_CHOICE,
			...lines.map((sl) => ({
				id: sl.serviceLineNumber,
				label: sl.nickname ? `${sl.serviceLineNumber} (${sl.nickname})` : sl.serviceLineNumber,
			})),
		]

		if (verbose) {
			if (lines.length === 0) {
				self.log('info', 'No service lines found on this account.')
			}
			for (const sl of lines) {
				self.log(
					'info',
					`Service line: number="${sl.serviceLineNumber}" nickname="${sl.nickname ?? ''}" active=${sl.active}`,
				)
			}
			if (res.content && !res.content.isLastPage) {
				self.log('info', `...and more (showing first ${lines.length} of ${res.content.totalCount}).`)
			}
		}
	} catch (err) {
		self.log('warn', `Failed to refresh service line list: ${describeErr(err)}`)
	}
}

/**
 * Fetches every user terminal (and any routers bonded to each) and caches them on
 * `self.knownUserTerminals` / `self.knownRouters` for the "Default User Terminal / Dish ID"
 * and "Default Router ID" config dropdowns. Also backs the "List User Terminals & Routers
 * (log only)" action - pass verbose=true there to log full details.
 */
export async function refreshUserTerminalsAndRouters(self: ModuleInstance, verbose = false): Promise<void> {
	try {
		const res = await self.api.listUserTerminals()
		const terminals = res.content?.results ?? []

		self.knownUserTerminals = [
			NONE_CHOICE,
			...terminals.map((ut) => ({
				id: ut.userTerminalId,
				label: ut.nickname ? `${ut.nickname} (${ut.userTerminalId})` : ut.userTerminalId,
			})),
		]

		const routers: DropdownChoice[] = [NONE_CHOICE]
		for (const ut of terminals) {
			for (const router of ut.routers) {
				routers.push({
					id: router.routerId,
					label: router.nickname ? `${router.nickname} (${router.routerId})` : router.routerId,
				})
			}
		}
		self.knownRouters = routers

		if (verbose) {
			if (terminals.length === 0) {
				self.log('info', 'No user terminals found on this account.')
			}
			for (const ut of terminals) {
				self.log(
					'info',
					`User terminal: id="${ut.userTerminalId}" nickname="${ut.nickname ?? ''}" kitSerial="${ut.kitSerialNumber}" serviceLine="${ut.serviceLineNumber ?? ''}"`,
				)
				for (const router of ut.routers) {
					self.log('info', `  └ Router: id="${router.routerId}" nickname="${router.nickname ?? ''}"`)
				}
			}
		}
	} catch (err) {
		self.log('warn', `Failed to refresh user terminal/router list: ${describeErr(err)}`)
	}
}

export async function refreshDeviceLists(self: ModuleInstance): Promise<void> {
	await Promise.all([refreshServiceLines(self, false), refreshUserTerminalsAndRouters(self, false)])
}
