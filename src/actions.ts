import type ModuleInstance from './main.js'
import { StarlinkApiError } from './api.js'
import { pollOnce } from './polling.js'

export type ActionsSchema = {
	arm_toggle: {
		options: {
			durationSeconds: number
			noAutoDisarm: boolean
		}
	}
	disarm: { options: Record<string, never> }
	refresh_status: { options: Record<string, never> }
	list_data_products: { options: Record<string, never> }
	list_service_lines: { options: Record<string, never> }
	list_user_terminals: { options: Record<string, never> }
	top_up_data: {
		options: {
			serviceLineNumber: string
			productId: string
			count: number
		}
	}
	reboot_dish: {
		options: {
			deviceId: string
		}
	}
	reboot_router: {
		options: {
			routerId: string
		}
	}
	set_public_ip: {
		options: {
			serviceLineNumber: string
			enabled: boolean
			confirm: boolean
		}
	}
}

/**
 * Every high-consequence write action MUST pass through this gate before touching the API:
 *   1. `enable_write_actions` must be turned on in the connection config (module-level kill switch).
 *   2. The safety interlock must currently be ARMED (see interlock.ts / the "Toggle Arm State" action).
 *   3. Optionally, a second press within the confirmation window (see ConfirmGate in
 *      interlock.ts) - the first press only arms the pending confirmation and does not execute.
 * Returns true only when all applicable checks pass and the caller should proceed.
 */
function guardWriteAction(self: ModuleInstance, label: string, confirmKey?: string): boolean {
	if (!self.config.enableWriteActions) {
		self.log(
			'warn',
			`[SAFETY] "${label}" blocked: write actions are disabled for this connection (Enable Write Actions is off).`,
		)
		return false
	}
	if (!self.interlock.isArmed()) {
		self.log('warn', `[SAFETY] "${label}" blocked: safety interlock is DISARMED. Press "Toggle Arm State" first.`)
		return false
	}
	if (confirmKey !== undefined && !self.confirmGate.press(confirmKey)) {
		self.log(
			'warn',
			`[SAFETY] "${label}" requires confirmation - press the same button again within a few seconds to execute.`,
		)
		return false
	}
	return true
}

async function runWrite(self: ModuleInstance, label: string, fn: () => Promise<unknown>): Promise<void> {
	try {
		await fn()
		self.log('info', `${label} succeeded.`)
	} catch (err) {
		const message = err instanceof StarlinkApiError ? err.message : err instanceof Error ? err.message : String(err)
		self.log('error', `${label} failed: ${message}`)
	} finally {
		// Single-use arm: force a re-arm before another high-consequence action can fire.
		self.interlock.disarm(`after executing "${label}"`)
		void pollOnce(self)
	}
}

export function UpdateActions(self: ModuleInstance): void {
	self.setActionDefinitions({
		arm_toggle: {
			name: 'Toggle Arm State',
			description: `Arms the safety interlock (default ${self.config.disarmTimeoutSeconds}s auto-disarm, override below), or disarms immediately if already armed.`,
			options: [
				{
					id: 'durationSeconds',
					type: 'number',
					label: `Arm duration, seconds (0 = use connection default: ${self.config.disarmTimeoutSeconds}s)`,
					default: 0,
					min: 0,
					max: 3600,
				},
				{
					id: 'noAutoDisarm',
					type: 'checkbox',
					label: 'Stay armed until manually disarmed (ignores duration above, no auto-disarm countdown)',
					default: false,
				},
			],
			callback: async (event) => {
				const seconds = event.options.noAutoDisarm
					? null
					: event.options.durationSeconds > 0
						? event.options.durationSeconds
						: self.config.disarmTimeoutSeconds || 10
				self.interlock.toggle(seconds)
			},
		},
		disarm: {
			name: 'Disarm (Panic)',
			description:
				'Immediately disarms the safety interlock, blocking any further high-consequence action until re-armed.',
			options: [],
			callback: async () => {
				self.interlock.disarm('manual panic disarm')
			},
		},
		refresh_status: {
			name: 'Refresh Telemetry Now',
			description:
				'Read-only: immediately re-polls account/service line/device status instead of waiting for the next poll interval.',
			options: [],
			callback: async () => {
				await pollOnce(self)
			},
		},
		list_data_products: {
			name: 'List Available Data Top-Up Products (log only)',
			description:
				'Read-only: fetches the account\'s available data products and writes their Product IDs to the Companion log, so you can find the correct Product ID for the "Emergency Priority Data Top-Up" action.',
			options: [],
			callback: async () => {
				try {
					const res = await self.api.listDataProducts()
					const products = Array.isArray(res.dataProducts) ? res.dataProducts : []
					if (products.length === 0) {
						self.log('info', 'No data products returned for this account.')
						return
					}
					for (const p of products) {
						self.log(
							'info',
							`Data product: id="${p.productId}" amount=${p.dataAmount}${p.dataUnit ?? ''} price=${p.price} ${p.isoCurrencyCode ?? ''}`,
						)
					}
				} catch (err) {
					const message =
						err instanceof StarlinkApiError ? err.message : err instanceof Error ? err.message : String(err)
					self.log('error', `Failed to list data products: ${message}`)
				}
			},
		},
		list_service_lines: {
			name: 'List Account Service Lines (log only)',
			description:
				'Read-only: fetches every service line on this account and writes Service Line Number, nickname, and active status to the Companion log, so you can find the value for "Default Service Line Number" in the config.',
			options: [],
			callback: async () => {
				try {
					const res = await self.api.listServiceLines()
					const lines = res.content?.results ?? []
					if (lines.length === 0) {
						self.log('info', 'No service lines found on this account.')
						return
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
				} catch (err) {
					const message =
						err instanceof StarlinkApiError ? err.message : err instanceof Error ? err.message : String(err)
					self.log('error', `Failed to list service lines: ${message}`)
				}
			},
		},
		list_user_terminals: {
			name: 'List User Terminals & Routers (log only)',
			description:
				'Read-only: fetches every user terminal (dish) on this account, plus any routers bonded to each, and writes their IDs to the Companion log - so you can find the values for "Default User Terminal / Dish ID" and "Default Router ID" in the config.',
			options: [],
			callback: async () => {
				try {
					const res = await self.api.listUserTerminals()
					const terminals = res.content?.results ?? []
					if (terminals.length === 0) {
						self.log('info', 'No user terminals found on this account.')
						return
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
				} catch (err) {
					const message =
						err instanceof StarlinkApiError ? err.message : err instanceof Error ? err.message : String(err)
					self.log('error', `Failed to list user terminals: ${message}`)
				}
			},
		},
		top_up_data: {
			name: 'Emergency Priority Data Top-Up',
			description:
				'Requires the connection to be ARMED (see "Toggle Arm State"). Adds a one-time priority data block to a service line.',
			options: [
				{
					id: 'serviceLineNumber',
					type: 'textinput',
					label: 'Service Line Number (blank = use connection default)',
					default: '',
				},
				{
					id: 'productId',
					type: 'textinput',
					label: 'Top-Up Product ID (see "List Available Data Top-Up Products")',
					default: '',
					minLength: 1,
				},
				{
					id: 'count',
					type: 'number',
					label: 'Quantity',
					default: 1,
					min: 1,
					max: 20,
				},
			],
			callback: async (event) => {
				const serviceLineNumber = event.options.serviceLineNumber || self.config.serviceLineNumber
				if (!serviceLineNumber) {
					self.log(
						'error',
						'Emergency Priority Data Top-Up: no Service Line Number set (button option or connection default).',
					)
					return
				}
				if (!event.options.productId) {
					self.log('error', 'Emergency Priority Data Top-Up: Product ID is required.')
					return
				}
				if (!guardWriteAction(self, 'Emergency Priority Data Top-Up')) return
				await runWrite(
					self,
					`Data top-up (${event.options.count}x ${event.options.productId} on ${serviceLineNumber})`,
					async () =>
						self.api.addDataTopUp(serviceLineNumber, {
							productId: event.options.productId,
							count: event.options.count,
						}),
				)
			},
		},
		reboot_dish: {
			name: 'Remote Reboot Dish',
			description: 'Requires the connection to be ARMED (see "Toggle Arm State"). Reboots the user terminal (dish).',
			options: [
				{
					id: 'deviceId',
					type: 'textinput',
					label: 'User Terminal / Dish ID (blank = use connection default)',
					default: '',
				},
			],
			callback: async (event) => {
				const deviceId = event.options.deviceId || self.config.deviceId
				if (!deviceId) {
					self.log('error', 'Remote Reboot Dish: no User Terminal / Dish ID set (button option or connection default).')
					return
				}
				if (!guardWriteAction(self, 'Remote Reboot Dish')) return
				await runWrite(self, `Reboot dish ${deviceId}`, async () => self.api.rebootUserTerminal(deviceId))
			},
		},
		reboot_router: {
			name: 'Remote Reboot Router',
			description: 'Requires the connection to be ARMED (see "Toggle Arm State"). Reboots the Starlink router.',
			options: [
				{
					id: 'routerId',
					type: 'textinput',
					label: 'Router ID (blank = use connection default)',
					default: '',
				},
			],
			callback: async (event) => {
				const routerId = event.options.routerId || self.config.routerId
				if (!routerId) {
					self.log('error', 'Remote Reboot Router: no Router ID set (button option or connection default).')
					return
				}
				if (!guardWriteAction(self, 'Remote Reboot Router')) return
				await runWrite(self, `Reboot router ${routerId}`, async () => self.api.rebootRouter(routerId))
			},
		},
		set_public_ip: {
			name: 'Set Dynamic Public IP',
			description:
				'ARMED + confirmation required. Enables or disables the dedicated public IP setting on a service line.',
			options: [
				{
					id: 'serviceLineNumber',
					type: 'textinput',
					label: 'Service Line Number (blank = use connection default)',
					default: '',
				},
				{
					id: 'enabled',
					type: 'checkbox',
					label: 'Enable dedicated public IP (unchecked = disable)',
					default: true,
				},
				{
					id: 'confirm',
					type: 'checkbox',
					label: 'Require a second press to confirm',
					default: true,
				},
			],
			callback: async (event) => {
				const serviceLineNumber = event.options.serviceLineNumber || self.config.serviceLineNumber
				if (!serviceLineNumber) {
					self.log('error', 'Set Dynamic Public IP: no Service Line Number set (button option or connection default).')
					return
				}
				const confirmKey = event.options.confirm ? `set_public_ip:${serviceLineNumber}` : undefined
				if (!guardWriteAction(self, 'Set Dynamic Public IP', confirmKey)) return
				await runWrite(self, `Set public IP=${event.options.enabled} on ${serviceLineNumber}`, async () =>
					self.api.setPublicIp(serviceLineNumber, event.options.enabled),
				)
			},
		},
	})
}
