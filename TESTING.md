# Manual Test Checklist

This module has been verified to compile, lint, and package cleanly (`npm run build`,
`npm run lint`, `npm run package`), but has **not** been exercised end-to-end against a
running Companion instance or a real Starlink account. Work through this list with real
credentials (ideally against a non-production service line) before relying on it for a
live broadcast.

## Setup / auth

- [ ] Client ID + Secret authenticate successfully (connection status goes green, not `Bad Config` / `Authentication Failure`)
- [ ] Invalid credentials produce a clear error status/log line, not a silent hang
- [ ] Token auto-refreshes after ~15 minutes without a visible hiccup (log shows one "OIDC token request" per ~15min, not on every poll)

## Read-only telemetry

- [ ] All variables populate correctly for your real account / service line / terminal / router IDs
- [ ] Fields with no data (e.g. no router attached) show `N/A` instead of crashing
- [ ] `data_used_percent` / `data_cap_gb` compute correctly against your actual plan
- [ ] Poll interval respects the configured value; no HTTP 429s in the log at your chosen interval
- [ ] `Refresh Telemetry Now` action forces an immediate poll

## Safety interlock

- [ ] `Toggle Arm State` arms and auto-disarms after the configured/default timeout
- [ ] Per-press duration override works
- [ ] `Stay armed until manually disarmed` checkbox arms with no countdown (`arm_seconds_remaining` reads `no timer`)
- [ ] `Disarm (Panic)` immediately disarms
- [ ] `armed_indicator` feedback flashes on the Master Safety Arm Switch preset while armed

## Write actions

Test in a non-live window, ideally against a disposable/test service line.

- [ ] With **Enable Write Actions** off: every write action is refused and logged, nothing reaches the API
- [ ] With it on but DISARMED: same refusal
- [ ] With it on and ARMED: Top-Up / Reboot Dish / Reboot Router fire on a single press and auto-disarm immediately afterward
- [ ] `Set Dynamic Public IP`'s second-press confirmation still works as expected
- [ ] A failed API call (bad product ID, wrong device ID) logs a clear error and does not crash the connection

## Live telemetry (Telemetry Cache API)

Requires the service account to have the "Device telemetry, View" permission (see HELP.md).

- [ ] With the permission granted: `latency_ms`, `obstruction_percent`, `signal_quality_percent`, `ping_drop_rate_percent`, `downlink_mbps`, `uplink_mbps`, `terminal_uptime`, `public_ip_address` populate with real values
- [ ] Router equivalents (`router_uptime`, `router_internet_latency_ms`, `router_dish_latency_ms`, `router_clients`) populate when a Router ID is configured
- [ ] Alert variables (`alert_obstruction`, `alert_thermal`, `alert_pop_change`, `alert_software_update_pending`, `alert_data_overage`, `alert_alignment_issue`) read `NO` under normal conditions, not stuck on `N/A`
- [ ] Without the permission (or with it revoked): these fields fall back to `N/A`/inactive, and the rest of the connection (account, service line, data usage) keeps working - only a "live telemetry" warning appears in the log, not a hard connection failure
- [ ] `High Latency Alert`, `Obstruction Alert`, `Thermal / Power Supply Alert`, `Point-of-Presence Change Alert`, `Data Overage Rate-Limited Alert`, `Alignment / Mount Alert` feedbacks trigger correctly when the corresponding condition is real (hard to force artificially - at minimum confirm they stay false/inactive under normal healthy conditions)

## Presets

- [ ] Info-only presets (Telemetry Display, Signal Health, Service Line Status, Data Usage, Public IP, Account Info, Router Status) do nothing on press, but update live from polling
- [ ] `List Top-Up Products (log)` logs real product IDs usable in the Top-Up preset's placeholder
