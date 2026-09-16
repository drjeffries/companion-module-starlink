import type {
	CompanionStaticUpgradeScript,
	CompanionUpgradeContext,
	CompanionStaticUpgradeProps,
	CompanionStaticUpgradeResult,
} from '@companion-module/base'
import type { ModuleConfig, ModuleSecrets } from './config.js'

export const UpgradeScripts: CompanionStaticUpgradeScript<ModuleConfig, ModuleSecrets>[] = [
	/*
	 * Place upgrade scripts here as the config/action/feedback shape evolves.
	 * Remember: once a script has shipped it cannot be removed or reordered.
	 */

	// v0.6.0: Client ID moved out of config into the secrets store (alongside Client Secret) so
	// it's excluded from Companion's "export without secrets" option. Carry over any saved value.
	(
		_context: CompanionUpgradeContext<ModuleConfig>,
		props: CompanionStaticUpgradeProps<ModuleConfig, ModuleSecrets>,
	): CompanionStaticUpgradeResult<ModuleConfig, ModuleSecrets> => {
		const oldConfig = props.config as (Record<string, unknown> & Partial<ModuleConfig>) | null
		const oldClientId = oldConfig?.clientId
		if (!oldConfig || typeof oldClientId !== 'string' || oldClientId === '') {
			return { updatedConfig: null, updatedActions: [], updatedFeedbacks: [] }
		}

		const restConfig: Record<string, unknown> = { ...oldConfig }
		delete restConfig.clientId

		return {
			updatedConfig: restConfig as unknown as ModuleConfig,
			updatedSecrets: { ...props.secrets, clientId: oldClientId } as ModuleSecrets,
			updatedActions: [],
			updatedFeedbacks: [],
		}
	},
]
