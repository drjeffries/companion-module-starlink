import type ModuleInstance from './main.js'

/**
 * Arm/disarm state machine that gates every high-consequence write action (top-up, reboot
 * dish, reboot router, set public IP). While DISARMED those actions are refused outright.
 * "Arm System" flips to ARMED for a configurable window and auto-disarms itself if nothing
 * happens, so a button left mis-pressed (or a crew member walking away) can't leave a live
 * broadcast truck armed indefinitely.
 */
export class SafetyInterlock {
	private armed = false
	/** null while armed means "no auto-disarm timer" (armed indefinitely until manually disarmed). */
	private armedUntilMs: number | null = 0
	private disarmTimer: NodeJS.Timeout | null = null
	private tickTimer: NodeJS.Timeout | null = null
	private blinkOn = false

	constructor(private readonly self: ModuleInstance) {}

	isArmed(): boolean {
		return this.armed
	}

	/** Toggles once per ~500ms while armed, driven by the internal countdown ticker - used by the flashing ARMED feedback. */
	isBlinkOn(): boolean {
		return this.blinkOn
	}

	/** null means armed with no auto-disarm timer (indefinite); 0 while disarmed. */
	secondsRemaining(): number | null {
		if (!this.armed) return 0
		if (this.armedUntilMs === null) return null
		return Math.max(0, Math.ceil((this.armedUntilMs - Date.now()) / 1000))
	}

	/** Pass `seconds: null` to arm indefinitely, with no auto-disarm timer. */
	arm(seconds: number | null): void {
		this.armed = true
		this.armedUntilMs = seconds === null ? null : Date.now() + seconds * 1000
		this.clearTimers()

		if (seconds !== null) {
			this.disarmTimer = setTimeout(() => this.disarm('auto-disarm timeout elapsed'), seconds * 1000)
		}
		// Drives the flashing ARMED feedback (and the countdown variable, when there is one) while armed.
		this.tickTimer = setInterval(() => {
			this.blinkOn = !this.blinkOn
			this.self.setVariableValues({ arm_seconds_remaining: this.formatSecondsRemaining() })
			this.self.checkFeedbacks('armed_indicator')
		}, 500)

		this.self.log(
			'warn',
			seconds === null
				? 'SAFETY INTERLOCK ARMED with no auto-disarm timer - high-consequence actions will be accepted until manually disarmed.'
				: `SAFETY INTERLOCK ARMED for ${seconds}s - high-consequence actions will be accepted until disarmed.`,
		)
		this.pushState()
	}

	disarm(reason = 'manual disarm'): void {
		if (!this.armed) return
		this.armed = false
		this.blinkOn = false
		this.clearTimers()
		this.self.log('info', `Safety interlock DISARMED (${reason}).`)
		this.pushState()
	}

	/** Pass `seconds: null` to arm indefinitely when toggling from disarmed to armed. */
	toggle(seconds: number | null): void {
		if (this.armed) {
			this.disarm('toggled off')
		} else {
			this.arm(seconds)
		}
	}

	private clearTimers(): void {
		if (this.disarmTimer) {
			clearTimeout(this.disarmTimer)
			this.disarmTimer = null
		}
		if (this.tickTimer) {
			clearInterval(this.tickTimer)
			this.tickTimer = null
		}
	}

	private formatSecondsRemaining(): string {
		const remaining = this.secondsRemaining()
		return remaining === null ? 'no timer' : String(remaining)
	}

	private pushState(): void {
		this.self.setVariableValues({
			arm_status: this.armed ? 'ARMED' : 'DISARMED',
			arm_seconds_remaining: this.formatSecondsRemaining(),
		})
		this.self.checkFeedbacks('armed_indicator')
	}

	destroy(): void {
		this.clearTimers()
	}
}

/**
 * Two-press confirmation gate for individual buttons, layered on top of the ARMED
 * requirement for the highest-consequence actions (reboot dish, reboot router). The first
 * press within the window arms a pending confirmation and is NOT executed; a second press
 * on the same key before the window elapses is treated as confirmed and executes.
 */
export class ConfirmGate {
	private pending = new Map<string, number>()

	constructor(private readonly windowMs = 4000) {}

	/** Returns true if this press should execute (i.e. it was the confirming second press). */
	press(key: string): boolean {
		const now = Date.now()
		const expiresAt = this.pending.get(key)
		if (expiresAt !== undefined && now < expiresAt) {
			this.pending.delete(key)
			return true
		}
		this.pending.set(key, now + this.windowMs)
		return false
	}

	clear(key: string): void {
		this.pending.delete(key)
	}
}
