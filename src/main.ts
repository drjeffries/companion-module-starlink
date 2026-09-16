import {
	InstanceBase,
	InstanceStatus,
	type DropdownChoice,
	type SomeCompanionConfigField,
} from '@companion-module/base'
import { GetConfigFields, type ModuleConfig, type ModuleSecrets } from './config.js'
import { UpdateVariableDefinitions, type VariablesSchema, pushConfigVariables } from './variables.js'
import { UpgradeScripts } from './upgrades.js'
import { UpdateActions, type ActionsSchema } from './actions.js'
import { UpdateFeedbacks, type FeedbacksSchema } from './feedbacks.js'
import { UpdatePresets } from './presets.js'
import { StarlinkApiClient } from './api.js'
import { SafetyInterlock, ConfirmGate } from './interlock.js'
import { createInitialTelemetryState, type TelemetryState } from './state.js'
import { startPolling, stopPolling } from './polling.js'
import { refreshDeviceLists } from './discovery.js'

export type ModuleSchema = {
	config: ModuleConfig
	secrets: ModuleSecrets
	actions: ActionsSchema
	feedbacks: FeedbacksSchema
	variables: VariablesSchema
}

export { UpgradeScripts }

export default class ModuleInstance extends InstanceBase<ModuleSchema> {
	config!: ModuleConfig // Set in init()/configUpdated()
	secrets!: ModuleSecrets // Set in init()/configUpdated()

	readonly api: StarlinkApiClient
	readonly interlock: SafetyInterlock
	readonly confirmGate: ConfirmGate
	readonly telemetry: TelemetryState = createInitialTelemetryState()
	pollTimer: ReturnType<typeof setInterval> | null = null

	// Cached choices for the Default Service Line / Terminal / Router config dropdowns,
	// populated by discovery.ts. Empty until the first successful fetch after init().
	knownServiceLines: DropdownChoice[] = [{ id: '', label: '(none)' }]
	knownUserTerminals: DropdownChoice[] = [{ id: '', label: '(none)' }]
	knownRouters: DropdownChoice[] = [{ id: '', label: '(none)' }]

	constructor(internal: unknown) {
		super(internal)
		this.api = new StarlinkApiClient(this)
		this.interlock = new SafetyInterlock(this)
		this.confirmGate = new ConfirmGate()
	}

	async init(config: ModuleConfig, _isFirstInit: boolean, secrets: ModuleSecrets): Promise<void> {
		this.config = config
		this.secrets = secrets
		this.updateStatus(InstanceStatus.Connecting)

		this.updateActions()
		this.updateFeedbacks()
		this.updatePresets()
		this.updateVariableDefinitions()
		pushConfigVariables(this)

		if (!config.enableWriteActions) {
			this.log(
				'warn',
				'This connection is in READ-ONLY mode (Enable Write Actions is off). Telemetry stays active; top-up/reboot/public-IP actions will be blocked.',
			)
		}
		if (!secrets.clientId || !secrets.clientSecret) {
			this.updateStatus(InstanceStatus.BadConfig, 'Client ID / Client Secret are required')
			return
		}

		startPolling(this)
		void refreshDeviceLists(this)
	}

	async destroy(): Promise<void> {
		stopPolling(this)
		this.interlock.destroy()
		this.log('debug', 'destroy')
	}

	async configUpdated(config: ModuleConfig, secrets: ModuleSecrets): Promise<void> {
		this.config = config
		this.secrets = secrets
		this.api.resetToken()
		pushConfigVariables(this)

		if (!secrets.clientId || !secrets.clientSecret) {
			stopPolling(this)
			this.updateStatus(InstanceStatus.BadConfig, 'Client ID / Client Secret are required')
			return
		}

		this.updateStatus(InstanceStatus.Connecting)
		startPolling(this)
		void refreshDeviceLists(this)
	}

	getConfigFields(): SomeCompanionConfigField[] {
		return GetConfigFields(this)
	}

	updateActions(): void {
		UpdateActions(this)
	}

	updateFeedbacks(): void {
		UpdateFeedbacks(this)
	}

	updatePresets(): void {
		UpdatePresets(this)
	}

	updateVariableDefinitions(): void {
		UpdateVariableDefinitions(this)
	}
}
