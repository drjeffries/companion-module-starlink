import type ModuleInstance from './main.js'
import type { ModuleSchema } from './main.js'
import type {
	CompanionPresetDefinitions,
	CompanionPresetSection,
	CompanionSomePresetDefinition,
	SomeButtonGraphicsElement,
	SomePresetSimpleFeedbackEntry,
} from '@companion-module/base'

const WHITE = 0xffffff
const BLACK = 0x000000
const DARK_GREY = 0x222222
const ARM_RED = 0xcc0000
const WARN_YELLOW = 0xffcc00
const CRITICAL_RED = 0xcc0000
const OK_GREEN = 0x00aa00
const CAUTION_ORANGE = 0x663300
const ALERT_AMBER = 0xff9900

function formatValueText(variableName: string, unit: string): string {
	return unit === '%' ? `$(starlink:${variableName})%` : `$(starlink:${variableName}) ${unit}`
}

/**
 * Builds the layered-button graphics (title + live value, overlaid on a radial ring gauge) shared by
 * all "gauge" telemetry presets. The gauge's `value` is bound to a live Companion variable expression,
 * so it redraws automatically on every poll with no feedback callback needed.
 *
 * `min`/`max` are plain numbers baked in at preset-build time (from config, for the throughput gauges),
 * not expressions - UpdatePresets() re-runs on every configUpdated(), so they stay in sync.
 */
function gaugeElements(opts: {
	title: string
	variableName: string
	unit: string
	min: number
	max: number
	/** Where the green<->yellow and yellow<->red gradient stops sit (ascending values). The colour
	 * holds solid from breakpoint2 to max, same as it holds solid from min to breakpoint1's gradient
	 * start. For a "higher is better" metric the colour order is reversed (red sits at min instead). */
	breakpoint1: number
	breakpoint2: number
	worseWhenHigher: boolean
}): SomeButtonGraphicsElement[] {
	const { title, variableName, unit, min, max, breakpoint1, breakpoint2, worseWhenHigher } = opts
	const [startColor, midColor, endColor] = worseWhenHigher
		? [OK_GREEN, WARN_YELLOW, CRITICAL_RED]
		: [CRITICAL_RED, WARN_YELLOW, OK_GREEN]
	const valueText = formatValueText(variableName, unit)

	// x/y/width/height on these elements are percent-of-button (0-100), not pixels. Text boxes use a
	// deliberately huge nominal fontsize (100) with fontsizeAllowShrink - that guarantees the text
	// always renders at the largest size its box actually allows, instead of guessing a fixed number
	// that's either too small (fights the box) or too big (gets clamped for no visible reason). The
	// title/value boxes are sized so they can't overlap (title ends at y53, value starts at y53).
	return [
		{ type: 'box', x: 0, y: 0, width: 100, height: 100, color: BLACK },
		{
			type: 'gauge',
			x: 0,
			y: 0,
			width: 100,
			height: 100,
			min,
			max,
			value: { isExpression: true, value: `$(starlink:${variableName})` },
			orientation: 'ring',
			startAngle: 0,
			endAngle: 360,
			ringWidth: 20,
			roundedEnds: true,
			fillEnabled: true,
			multiColour: true,
			trackStyle: 'dimmed',
			stops: [
				{ value: min, color: startColor, gradient: true },
				{ value: breakpoint1, color: midColor, gradient: true },
				{ value: breakpoint2, color: endColor, gradient: true },
			],
		},
		// Title is the dominant element, centered in the ring: at real Stream Deck key size (~16mm key,
		// viewed from arm's length) it's what's actually legible at a glance - the ring's colour
		// already communicates good/bad without reading a number. The value is secondary, below it.
		{
			type: 'text',
			x: 0,
			y: 16,
			width: 100,
			height: 37,
			text: title,
			fontsize: 100,
			fontsizeAllowShrink: true,
			weight: 'bold',
			font: 'companion-mono',
			halign: 'center',
			valign: 'center',
			color: WHITE,
		},
		{
			type: 'text',
			x: 0,
			y: 53,
			width: 100,
			height: 29,
			text: valueText,
			fontsize: 100,
			fontsizeAllowShrink: true,
			halign: 'center',
			valign: 'center',
			color: WHITE,
		},
	]
}

/**
 * A gauge preset, wrapped as `type: 'alternatives'` with a plain-text fallback variant.
 *
 * The bar-gauge graphics element used here shipped in @companion-module/base v2.1.0 (mid-2026) - a
 * host running an older Companion core won't understand it. `alternatives` is the SDK's own mechanism
 * for this: it lists variants most-preferred first and the host renders whichever one it supports, so
 * an older Companion falls back to a plain colour-coded text button instead of a missing/broken preset.
 */
function gaugePreset(opts: {
	name: string
	title: string
	variableName: string
	unit: string
	min: number
	max: number
	breakpoint1: number
	breakpoint2: number
	worseWhenHigher: boolean
	fallbackFeedbacks?: SomePresetSimpleFeedbackEntry<ModuleSchema>[]
}): CompanionSomePresetDefinition<ModuleSchema> {
	const { name, title, variableName, unit, min, max, breakpoint1, breakpoint2, worseWhenHigher, fallbackFeedbacks } =
		opts
	return {
		type: 'alternatives',
		variants: [
			{
				type: 'layered',
				name,
				canvas: {},
				elements: gaugeElements({ title, variableName, unit, min, max, breakpoint1, breakpoint2, worseWhenHigher }),
				steps: [{ down: [], up: [] }],
				feedbacks: [],
			},
			{
				type: 'simple',
				name,
				style: {
					text: `${title}\n${formatValueText(variableName, unit)}`,
					size: '14',
					color: WHITE,
					bgcolor: BLACK,
					show_topbar: false,
				},
				steps: [{ down: [], up: [] }],
				feedbacks: fallbackFeedbacks ?? [],
			},
		],
	}
}

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
			name: 'Write Actions (require ARMED)',
			description:
				'These only execute while the connection is ARMED (see Safety Interlock above) - a press while DISARMED is refused and logged.',
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
					id: 'telemetry-info-group',
					type: 'simple',
					name: 'Status Displays (Info Only - No Action)',
					presets: [
						'telemetry_display',
						'signal_health',
						'service_line_status',
						'data_usage_display',
						'public_ip_display',
						'account_info',
						'router_status',
					],
				},
				{
					id: 'telemetry-gauge-group',
					type: 'simple',
					name: 'Gauges (Info Only - No Action)',
					presets: [
						'gauge_download',
						'gauge_upload',
						'gauge_signal_quality',
						'gauge_obstruction',
						'gauge_ping_drop',
						'gauge_latency',
						'gauge_data_used',
					],
				},
				{
					id: 'telemetry-utility-group',
					type: 'simple',
					name: 'Read-Only Utilities',
					presets: ['list_topup_products', 'list_service_lines', 'list_user_terminals'],
				},
			],
		},
	]

	const presets: CompanionPresetDefinitions<ModuleSchema> = {}

	presets['master_arm_switch'] = {
		type: 'simple',
		name: 'Master Safety Arm Switch',
		style: {
			text: 'SAFETY\n$(starlink:arm_status)\n$(starlink:arm_seconds_remaining)',
			size: '14',
			color: WHITE,
			bgcolor: DARK_GREY,
			show_topbar: false,
		},
		steps: [{ down: [{ actionId: 'arm_toggle', options: { durationSeconds: 0, noAutoDisarm: false } }], up: [] }],
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
			text: 'TOP-UP\n50GB\n(ARM first)',
			size: '14',
			color: WHITE,
			bgcolor: CAUTION_ORANGE,
			show_topbar: false,
		},
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
			text: 'REBOOT\nDISH\n(ARM first)',
			size: '14',
			color: WHITE,
			bgcolor: CAUTION_ORANGE,
			show_topbar: false,
		},
		steps: [{ down: [{ actionId: 'reboot_dish', options: { deviceId: '' } }], up: [] }],
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
			text: 'REBOOT\nROUTER\n(ARM first)',
			size: '14',
			color: WHITE,
			bgcolor: CAUTION_ORANGE,
			show_topbar: false,
		},
		steps: [{ down: [{ actionId: 'reboot_router', options: { routerId: '' } }], up: [] }],
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
		name: 'Telemetry Display (Info Only)',
		style: {
			text: '$(starlink:service_line_nickname)\nData $(starlink:data_used_gb)GB ($(starlink:data_used_percent)%)\nLatency $(starlink:latency_ms)ms',
			size: '14',
			color: WHITE,
			bgcolor: BLACK,
			show_topbar: false,
		},
		// Info only - no press action. Values update automatically from the telemetry poll.
		steps: [{ down: [], up: [] }],
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

	presets['signal_health'] = {
		type: 'simple',
		name: 'Signal Health (Info Only)',
		style: {
			text: 'Latency $(starlink:latency_ms)ms\nObstruction $(starlink:obstruction_percent)%\nSignal $(starlink:signal_quality_percent)%',
			size: '14',
			color: WHITE,
			bgcolor: BLACK,
			show_topbar: false,
		},
		// Info only - no press action. Values update automatically from the telemetry poll.
		// Requires the "Device telemetry, View" permission on the service account - see HELP.
		steps: [{ down: [], up: [] }],
		feedbacks: [
			{
				feedbackId: 'high_latency_alert',
				options: { thresholdMs: 100 },
				style: { bgcolor: ALERT_AMBER, color: BLACK },
			},
			{ feedbackId: 'obstruction_alert', options: {}, style: { bgcolor: ALERT_AMBER, color: BLACK } },
			{ feedbackId: 'pop_change_alert', options: {}, style: { bgcolor: ALERT_AMBER, color: BLACK } },
			{ feedbackId: 'alignment_alert', options: {}, style: { bgcolor: CRITICAL_RED, color: WHITE } },
			{ feedbackId: 'thermal_alert', options: {}, style: { bgcolor: CRITICAL_RED, color: WHITE } },
		],
	}

	presets['service_line_status'] = {
		type: 'simple',
		name: 'Service Line Status (Info Only)',
		style: {
			text: '$(starlink:service_line_number)\n$(starlink:service_line_nickname)\nActive: $(starlink:service_line_active)',
			size: '14',
			color: WHITE,
			bgcolor: BLACK,
			show_topbar: false,
		},
		// Info only - no press action. Values update automatically from the telemetry poll.
		steps: [{ down: [], up: [] }],
		feedbacks: [
			{ feedbackId: 'terminal_status_ok', options: {}, style: { bgcolor: OK_GREEN, color: WHITE } },
			{ feedbackId: 'terminal_status_fault', options: {}, style: { bgcolor: CRITICAL_RED, color: WHITE } },
		],
	}

	presets['data_usage_display'] = {
		type: 'simple',
		name: 'Data Usage (Info Only)',
		style: {
			text: 'Priority: $(starlink:data_used_gb)GB\nCap: $(starlink:data_cap_gb)GB\n$(starlink:data_used_percent)%',
			size: '14',
			color: WHITE,
			bgcolor: BLACK,
			show_topbar: false,
		},
		// Info only - no press action. Values update automatically from the telemetry poll.
		steps: [{ down: [], up: [] }],
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
			{ feedbackId: 'data_overage_alert', options: {}, style: { bgcolor: CRITICAL_RED, color: WHITE } },
		],
	}

	presets['public_ip_display'] = {
		type: 'simple',
		name: 'Public IP (Info Only)',
		style: {
			text: 'Public IP\n$(starlink:public_ip_address)\nDedicated: $(starlink:public_ip_enabled)',
			size: '14',
			color: WHITE,
			bgcolor: BLACK,
			show_topbar: false,
		},
		// Info only - no press action. The address comes from the Telemetry API and requires the
		// "Device telemetry, View" permission on the service account - see HELP.
		steps: [{ down: [], up: [] }],
		feedbacks: [{ feedbackId: 'pop_change_alert', options: {}, style: { bgcolor: ALERT_AMBER, color: BLACK } }],
	}

	presets['account_info'] = {
		type: 'simple',
		name: 'Account Info (Info Only)',
		style: {
			text: '$(starlink:account_name)\n$(starlink:account_number)\n$(starlink:region_code)',
			size: '14',
			color: WHITE,
			bgcolor: BLACK,
			show_topbar: false,
		},
		// Info only - no press action. Values update automatically from the telemetry poll.
		steps: [{ down: [], up: [] }],
		feedbacks: [],
	}

	presets['router_status'] = {
		type: 'simple',
		name: 'Router Status (Info Only)',
		style: {
			text: '$(starlink:router_nickname)\nClients $(starlink:router_clients)\nLatency $(starlink:router_dish_latency_ms)ms',
			size: '14',
			color: WHITE,
			bgcolor: BLACK,
			show_topbar: false,
		},
		// Info only - no press action. Values update automatically from the telemetry poll.
		steps: [{ down: [], up: [] }],
		feedbacks: [],
	}

	// Gauge presets: layered-graphics buttons with a live colour-graded bar (falling back to plain
	// text on older Companion cores - see gaugePreset()). Info only - no press action; the bar and
	// number redraw automatically from the telemetry poll via variable expressions. Requires the
	// "Device telemetry, View" permission on the service account - see HELP.
	// Download/Upload: green/yellow/red at thirds of your configured expected peak - getting under a
	// third of what you're paying for is the "unusable" end of the scale.
	const downloadPeak = self.config.gaugeMaxDownloadMbps || 220
	const uploadPeak = self.config.gaugeMaxUploadMbps || 25

	presets['gauge_download'] = gaugePreset({
		name: 'Download Gauge (Info Only)',
		title: 'DOWNLOAD',
		variableName: 'downlink_mbps',
		unit: 'Mbps',
		min: 0,
		max: downloadPeak,
		breakpoint1: downloadPeak / 3,
		breakpoint2: (downloadPeak * 2) / 3,
		worseWhenHigher: false,
	})

	presets['gauge_upload'] = gaugePreset({
		name: 'Upload Gauge (Info Only)',
		title: 'UPLOAD',
		variableName: 'uplink_mbps',
		unit: 'Mbps',
		min: 0,
		max: uploadPeak,
		breakpoint1: uploadPeak / 3,
		breakpoint2: (uploadPeak * 2) / 3,
		worseWhenHigher: false,
	})

	// Signal Quality is Starlink's own SNR-derived 0-100% metric (their API docs cap it at 0-10dB
	// mapped to 0-1) - the full range is already meaningful, so no narrowing, just even thirds since
	// Starlink doesn't publish specific tier thresholds for this derived percentage.
	presets['gauge_signal_quality'] = gaugePreset({
		name: 'Signal Quality Gauge (Info Only)',
		title: 'SIGNAL',
		variableName: 'signal_quality_percent',
		unit: '%',
		min: 0,
		max: 100,
		breakpoint1: 33,
		breakpoint2: 66,
		worseWhenHigher: false,
	})

	// Obstruction: matches the connection's own hand-tuned reference button (min 0/max 15%, green->yellow
	// at 5%, yellow->red at 10%) - real-world observation that serious degradation sets in well before
	// 15%, so the naive 0-100% scale wasted almost the whole ring on obstruction levels that never happen.
	presets['gauge_obstruction'] = gaugePreset({
		name: 'Obstruction Gauge (Info Only)',
		title: 'OBSTRUCT',
		variableName: 'obstruction_percent',
		unit: '%',
		min: 0,
		max: 15,
		breakpoint1: 5,
		breakpoint2: 10,
		worseWhenHigher: true,
		fallbackFeedbacks: [
			{ feedbackId: 'obstruction_alert', options: {}, style: { bgcolor: ALERT_AMBER, color: BLACK } },
		],
	})

	// Ping Drop Rate: general streaming/VoIP guidance puts <1% as good, 1-2.5% as acceptable, and
	// 5-10% as significantly impacting real-time quality; Starlink's own baseline is typically a
	// 0.2-0.6% steady rate with brief ~1.4% micro-loss spikes at satellite handovers. 0-9% narrows the
	// scale into that meaningful range instead of wasting most of a 0-100% ring.
	presets['gauge_ping_drop'] = gaugePreset({
		name: 'Ping Drop Rate Gauge (Info Only)',
		title: 'PING DROP',
		variableName: 'ping_drop_rate_percent',
		unit: '%',
		min: 0,
		max: 9,
		breakpoint1: 3,
		breakpoint2: 6,
		worseWhenHigher: true,
	})

	// Latency: matches published guidance - Starlink's typical/target range is ~20-60ms (good), 60-100ms
	// is "acceptable but noticeable," and 100ms+ is degraded for real-time use.
	presets['gauge_latency'] = gaugePreset({
		name: 'Latency Gauge (Info Only)',
		title: 'LATENCY',
		variableName: 'latency_ms',
		unit: 'ms',
		min: 0,
		max: 150,
		breakpoint1: 50,
		breakpoint2: 100,
		worseWhenHigher: true,
		fallbackFeedbacks: [
			{
				feedbackId: 'high_latency_alert',
				options: { thresholdMs: 100 },
				style: { bgcolor: ALERT_AMBER, color: BLACK },
			},
		],
	})

	// Data Used: reuses the same 80%/95% breakpoints as the data_usage_warning/critical feedbacks
	// elsewhere in this module, rather than inventing a separate scale for the same real threshold.
	presets['gauge_data_used'] = gaugePreset({
		name: 'Data Used Gauge (Info Only)',
		title: 'DATA USED',
		variableName: 'data_used_percent',
		unit: '%',
		min: 0,
		max: 100,
		breakpoint1: 80,
		breakpoint2: 95,
		worseWhenHigher: true,
		fallbackFeedbacks: [
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
	})

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

	presets['list_service_lines'] = {
		type: 'simple',
		name: 'List Service Lines (log)',
		style: {
			text: 'List\nService Lines',
			size: '14',
			color: WHITE,
			bgcolor: DARK_GREY,
			show_topbar: false,
		},
		steps: [{ down: [{ actionId: 'list_service_lines', options: {} }], up: [] }],
		feedbacks: [],
	}

	presets['list_user_terminals'] = {
		type: 'simple',
		name: 'List Terminals & Routers (log)',
		style: {
			text: 'List\nTerminals/Routers',
			size: '14',
			color: WHITE,
			bgcolor: DARK_GREY,
			show_topbar: false,
		},
		steps: [{ down: [{ actionId: 'list_user_terminals', options: {} }], up: [] }],
		feedbacks: [],
	}

	self.setPresetDefinitions(structure, presets)
}
