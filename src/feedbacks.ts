import type ModuleInstance from './main.js'

export type FeedbacksSchema = {
	armed_indicator: {
		type: 'boolean'
		options: Record<string, never>
	}
	data_usage_warning: {
		type: 'boolean'
		options: { thresholdPercent: number }
	}
	data_usage_critical: {
		type: 'boolean'
		options: { thresholdPercent: number }
	}
	terminal_status_ok: {
		type: 'boolean'
		options: Record<string, never>
	}
	terminal_status_fault: {
		type: 'boolean'
		options: Record<string, never>
	}
}

const ARMED_RED = 0xcc0000
const WARN_YELLOW = 0xffcc00
const CRITICAL_RED = 0xcc0000
const OK_GREEN = 0x00aa00
const FAULT_RED = 0xcc0000

export function UpdateFeedbacks(self: ModuleInstance): void {
	self.setFeedbackDefinitions({
		armed_indicator: {
			name: 'Safety Interlock: ARMED (flashing)',
			description:
				'True (and alternates amber/red) while the safety interlock is ARMED. Use as the style for the Master Safety Arm Switch button.',
			type: 'boolean',
			defaultStyle: { bgcolor: ARMED_RED, color: 0xffffff },
			options: [],
			callback: () => {
				// Alternates bgcolor between amber and red every ~500ms via the interlock's own
				// countdown ticker (see interlock.ts), which re-runs checkFeedbacks on each tick.
				return self.interlock.isArmed() && self.interlock.isBlinkOn()
			},
		},
		data_usage_warning: {
			name: 'Data Usage: Warning threshold reached',
			description:
				'True once priority data usage reaches the warning percentage of the recurring allotment (default 80%).',
			type: 'boolean',
			defaultStyle: { bgcolor: WARN_YELLOW, color: 0x000000 },
			options: [
				{
					id: 'thresholdPercent',
					type: 'number',
					label: 'Warning threshold (%)',
					default: 80,
					min: 1,
					max: 100,
				},
			],
			callback: (feedback) => {
				const pct = self.telemetry.dataUsedPercent
				if (pct === null) return false
				return pct >= feedback.options.thresholdPercent
			},
		},
		data_usage_critical: {
			name: 'Data Usage: Critical threshold reached',
			description:
				'True once priority data usage reaches the critical percentage of the recurring allotment (default 95%). Stack after the warning feedback on a button so it takes visual priority.',
			type: 'boolean',
			defaultStyle: { bgcolor: CRITICAL_RED, color: 0xffffff },
			options: [
				{
					id: 'thresholdPercent',
					type: 'number',
					label: 'Critical threshold (%)',
					default: 95,
					min: 1,
					max: 100,
				},
			],
			callback: (feedback) => {
				const pct = self.telemetry.dataUsedPercent
				if (pct === null) return false
				return pct >= feedback.options.thresholdPercent
			},
		},
		terminal_status_ok: {
			name: 'Terminal Link: Service Active',
			description:
				'True when the configured service line is reported ACTIVE by Starlink. NOTE: this reflects account-level service activation, not momentary RF obstruction - the Public API does not expose live link/obstruction state (see module HELP).',
			type: 'boolean',
			defaultStyle: { bgcolor: OK_GREEN, color: 0xffffff },
			options: [],
			callback: () => self.telemetry.pollOk && self.telemetry.serviceLineActive === true,
		},
		terminal_status_fault: {
			name: 'Terminal Link: Inactive / Unreachable',
			description:
				'True when the configured service line is reported inactive, or the last telemetry poll failed to reach Starlink.',
			type: 'boolean',
			defaultStyle: { bgcolor: FAULT_RED, color: 0xffffff },
			options: [],
			callback: () => !self.telemetry.pollOk || self.telemetry.serviceLineActive === false,
		},
	})
}
