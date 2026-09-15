import type ModuleInstance from './main.js'
import type { ModuleSchema } from './main.js'
import type { CompanionPresetDefinitions, CompanionPresetSection } from '@companion-module/base'

const WHITE = 0xffffff
const BLACK = 0x000000
const DARK_GREY = 0x222222
const ARM_RED = 0xcc0000
const WARN_YELLOW = 0xffcc00
const CRITICAL_RED = 0xcc0000
const OK_GREEN = 0x00aa00
const CAUTION_ORANGE = 0x663300

export function UpdatePresets(self: ModuleInstance): void {
	const structure: CompanionPresetSection<ModuleSchema>[] = [
		{
			id: 'safety',
			name: 'Safety Interlock',
			definitions: [
				{ id: 'safety-group', type: 'simple', name: 'Arm / Disarm', presets: ['master_arm_switch', 'panic_disarm'] },
			],
		},
		{
			id: 'write-actions',
			name: 'Write Actions (require ARMED + confirmation)',
			definitions: [
				{
					id: 'write-group',
					type: 'simple',
					name: 'High-Consequence Actions',
					presets: ['topup_50gb', 'panic_reboot_dish', 'panic_reboot_router'],
				},
			],
		},
		{
			id: 'telemetry',
			name: 'Telemetry / Read-Only',
			definitions: [
				{
					id: 'telemetry-group',
					type: 'simple',
					name: 'Status Displays',
					presets: [
						'telemetry_display',
						'service_line_status',
						'data_usage_display',
						'account_info',
						'router_status',
						'list_topup_products',
					],
				},
			],
		},
	]

	const presets: CompanionPresetDefinitions<ModuleSchema> = {}

	presets['master_arm_switch'] = {
		type: 'simple',
		name: 'Master Safety Arm Switch',
		style: {
			text: 'SAFETY\n$(starlink:arm_status)\n$(starlink:arm_seconds_remaining)s',
			size: '14',
			color: WHITE,
			bgcolor: DARK_GREY,
			show_topbar: false,
		},
		steps: [{ down: [{ actionId: 'arm_toggle', options: {} }], up: [] }],
		feedbacks: [
			{
				feedbackId: 'armed_indicator',
				options: {},
				style: { bgcolor: ARM_RED, color: WHITE },
			},
		],
	}

	presets['panic_disarm'] = {
		type: 'simple',
		name: 'Panic Disarm',
		style: {
			text: 'DISARM\nNOW',
			size: '14',
			color: WHITE,
			bgcolor: DARK_GREY,
			show_topbar: false,
		},
		steps: [{ down: [{ actionId: 'disarm', options: {} }], up: [] }],
		feedbacks: [],
	}

	presets['topup_50gb'] = {
		type: 'simple',
		name: 'Instant 50GB Top-Up',
		style: {
			text: 'TOP-UP\n50GB\n(hold to arm first)',
			size: '14',
			color: WHITE,
			bgcolor: CAUTION_ORANGE,
			show_topbar: false,
		},
		options: {},
		steps: [
			{
				// Replace productId with the real 50GB top-up Product ID for this account -
				// run the "List Available Data Top-Up Products" action once and check the log.
				down: [
					{
						actionId: 'top_up_data',
						options: {
							serviceLineNumber: '',
							productId: 'REPLACE_WITH_50GB_TOPUP_PRODUCT_ID',
							count: 1,
							confirm: true,
						},
					},
				],
				up: [],
			},
		],
		feedbacks: [
			{
				feedbackId: 'armed_indicator',
				options: {},
				style: { bgcolor: ARM_RED, color: WHITE },
			},
		],
	}

	presets['panic_reboot_dish'] = {
		type: 'simple',
		name: 'Panic Reboot Dish',
		style: {
			text: 'REBOOT\nDISH\n(press twice)',
			size: '14',
			color: WHITE,
			bgcolor: CAUTION_ORANGE,
			show_topbar: false,
		},
		steps: [{ down: [{ actionId: 'reboot_dish', options: { deviceId: '', confirm: true } }], up: [] }],
		feedbacks: [
			{
				feedbackId: 'armed_indicator',
				options: {},
				style: { bgcolor: ARM_RED, color: WHITE },
			},
		],
	}

	presets['panic_reboot_router'] = {
		type: 'simple',
		name: 'Panic Reboot Router',
		style: {
			text: 'REBOOT\nROUTER\n(press twice)',
			size: '14',
			color: WHITE,
			bgcolor: CAUTION_ORANGE,
			show_topbar: false,
		},
		steps: [{ down: [{ actionId: 'reboot_router', options: { routerId: '', confirm: true } }], up: [] }],
		feedbacks: [
			{
				feedbackId: 'armed_indicator',
				options: {},
				style: { bgcolor: ARM_RED, color: WHITE },
			},
		],
	}

	presets['telemetry_display'] = {
		type: 'simple',
		name: 'Telemetry Display',
		style: {
			text: '$(starlink:service_line_nickname)\nData $(starlink:data_used_gb)GB ($(starlink:data_used_percent))\nLatency $(starlink:latency_ms)ms',
			size: '14',
			color: WHITE,
			bgcolor: BLACK,
			show_topbar: false,
		},
		steps: [{ down: [{ actionId: 'refresh_status', options: {} }], up: [] }],
		feedbacks: [
			{
				feedbackId: 'data_usage_warning',
				options: { thresholdPercent: 80 },
				style: { bgcolor: WARN_YELLOW, color: BLACK },
			},
			{
				feedbackId: 'data_usage_critical',
				options: { thresholdPercent: 95 },
				style: { bgcolor: CRITICAL_RED, color: WHITE },
			},
			{ feedbackId: 'terminal_status_fault', options: {}, style: { bgcolor: CRITICAL_RED, color: WHITE } },
		],
	}

	presets['service_line_status'] = {
		type: 'simple',
		name: 'Service Line Status',
		style: {
			text: '$(starlink:service_line_number)\n$(starlink:service_line_nickname)\nActive: $(starlink:service_line_active)',
			size: '14',
			color: WHITE,
			bgcolor: BLACK,
			show_topbar: false,
		},
		steps: [{ down: [{ actionId: 'refresh_status', options: {} }], up: [] }],
		feedbacks: [
			{ feedbackId: 'terminal_status_ok', options: {}, style: { bgcolor: OK_GREEN, color: WHITE } },
			{ feedbackId: 'terminal_status_fault', options: {}, style: { bgcolor: CRITICAL_RED, color: WHITE } },
		],
	}

	presets['data_usage_display'] = {
		type: 'simple',
		name: 'Data Usage',
		style: {
			text: 'Priority: $(starlink:data_used_gb)GB\nCap: $(starlink:data_cap_gb)GB\n$(starlink:data_used_percent)',
			size: '14',
			color: WHITE,
			bgcolor: BLACK,
			show_topbar: false,
		},
		steps: [{ down: [{ actionId: 'refresh_status', options: {} }], up: [] }],
		feedbacks: [
			{
				feedbackId: 'data_usage_warning',
				options: { thresholdPercent: 80 },
				style: { bgcolor: WARN_YELLOW, color: BLACK },
			},
			{
				feedbackId: 'data_usage_critical',
				options: { thresholdPercent: 95 },
				style: { bgcolor: CRITICAL_RED, color: WHITE },
			},
		],
	}

	presets['account_info'] = {
		type: 'simple',
		name: 'Account Info',
		style: {
			text: '$(starlink:account_name)\n$(starlink:account_number)\n$(starlink:region_code)',
			size: '14',
			color: WHITE,
			bgcolor: BLACK,
			show_topbar: false,
		},
		steps: [{ down: [{ actionId: 'refresh_status', options: {} }], up: [] }],
		feedbacks: [],
	}

	presets['router_status'] = {
		type: 'simple',
		name: 'Router Status',
		style: {
			text: 'Router\n$(starlink:router_nickname)\n$(starlink:router_id)',
			size: '14',
			color: WHITE,
			bgcolor: BLACK,
			show_topbar: false,
		},
		steps: [{ down: [{ actionId: 'refresh_status', options: {} }], up: [] }],
		feedbacks: [],
	}

	presets['list_topup_products'] = {
		type: 'simple',
		name: 'List Top-Up Products (log)',
		style: {
			text: 'List\nData Products',
			size: '14',
			color: WHITE,
			bgcolor: DARK_GREY,
			show_topbar: false,
		},
		steps: [{ down: [{ actionId: 'list_data_products', options: {} }], up: [] }],
		feedbacks: [],
	}

	self.setPresetDefinitions(structure, presets)
}
