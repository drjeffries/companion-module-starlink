# Starlink

Monitors and controls Starlink Business/Enterprise service lines, user terminals (dishes)
and routers via the Starlink Public API v2, with a safety-interlock arming system so a
stray button press during a live broadcast can't reboot the link or trigger a paid data
top-up.

## Subscription / account requirements

- **The Starlink Public API is only available to Business/Enterprise-tier accounts**
  (Business, Enterprise, Maritime, Aviation). It is not available on consumer **Residential**
  or **Roam** plans - no set of credentials will make this module work on those.
- **Emergency Priority Data Top-Up** additionally requires the target service line to be on
  a data plan that supports top-ups (a metered/priority plan with a data pool). Starlink
  itself rejects the request with an error on plans that don't support it (e.g. some
  unlimited plans) - that's enforced server-side, not by this module.
- **Live RF telemetry** (latency, obstruction, signal quality, public IP, alert feedbacks)
  requires the **Device telemetry (View)** permission on the service account - see below.
  Everything else in the module works without it.

## Getting an API application

1. Log in to the Starlink Business admin portal.
2. Create an API application (Account → API keys / API Access) to get a **Client ID** and
   **Client Secret**. This module authenticates with the OIDC `client_credentials` grant -
   no user login flow is needed.
3. Grant the service account at least these permissions: **Account information (View)**,
   **Service plan (View/Edit)**, **Device management (View)**, **Device command and
   configuration (Edit)**, and **Device telemetry (View)**. The last one is required for
   live latency/obstruction/signal/public-IP data (see below) - without it, those
   variables/feedbacks simply stay `N/A` while everything else keeps working.
4. Save the connection with just Client ID/Secret filled in. A few seconds later, reopen
   this panel: **Default Service Line Number**, **Default User Terminal / Dish ID**, and
   **Default Router ID** are dropdowns pulled live from your account - pick from the list,
   or choose "Custom value" to type an ID directly. If a dropdown still only shows
   "(none)", press the **"List Account Service Lines (log only)"** / **"List User Terminals
   & Routers (log only)"** actions (also available as ready-made presets under "Read-Only
   Utilities") to refresh it and log full details, then reopen this panel again.

## Exporting connections/pages without secrets

Companion's own export feature can omit secrets. **Client ID and Client Secret are both
excluded** when you export without secrets, since this module stores both in Companion's
secrets store, not its regular config. **Default Service Line Number, Default User
Terminal / Dish ID, and Default Router ID are NOT excluded** - they have to live in regular
config for their dropdowns (populated from your account) to work, and Companion's secrets
store only supports plain text fields, not dropdowns. If you're sharing an exported
connection or page (e.g. in a support request or a shared repo) and don't want your service
line number or device/router IDs visible to whoever receives it, clear those three fields
first or scrub them from the exported file by hand.

## Polling and rate limits

Starlink API v2 allows **250 requests/minute per account**, shared across every integration
using that account - not exclusive to this connection. This module makes about 6 requests
per poll cycle (5 management-API calls plus 1 telemetry cache call). The **Telemetry Poll
Interval** field defaults to 60 seconds, which uses a small fraction of that budget and
leaves headroom for other tools. You can lower it, but Starlink's own docs recommend against
polling the management API at high frequency, and the live telemetry values themselves are
only produced a few times a minute on Starlink's side regardless of how often you poll - so
going much faster than 60s buys little. The bearer token endpoint has its own, stricter
limit (1000 auths/15min per IP); this module caches and reuses tokens for their full
15-minute lifetime, so normal polling never comes close to that limit.

## Read-only by default

With **Enable Write Actions** unchecked in the connection config, this module is strictly
read-only: telemetry keeps polling and all variables/feedbacks stay live, but every write
action (top-up, reboot dish, reboot router, set public IP) is refused and logged as a
warning instead of being sent to Starlink.

## Safety interlock ("Arm / Disarm")

Even with write actions enabled, none of the high-consequence actions will fire unless the
connection is **ARMED**:

1. Press **"Toggle Arm State"** (or the "Master Safety Arm Switch" preset) to arm. By
   default it arms for the connection's configured auto-disarm timeout (set in the config),
   but the action itself lets you override the duration per press, or check **"Stay armed
   until manually disarmed"** to arm with no countdown at all (use "Disarm (Panic)" or press
   the toggle again to end it).
2. While armed, `$(starlink:arm_status)` reads `ARMED` and `$(starlink:arm_seconds_remaining)`
   shows the countdown (or `no timer` if armed indefinitely).
3. **Emergency Priority Data Top-Up**, **Remote Reboot Dish** and **Remote Reboot Router**
   execute on a single press as soon as the connection is ARMED - no extra double-press or
   hold is required, since arming is itself the deliberate two-step ("arm, then act") gesture.
   Each one still re-disarms the connection automatically the instant it runs, so a second
   dangerous action always requires a fresh, deliberate re-arm.
4. **Set Dynamic Public IP** additionally has its own "Require a second press to confirm"
   option (on by default): the first press only arms a pending confirmation, and the button
   must be pressed again within a few seconds to actually execute.

## Live telemetry (latency, obstruction, signal, public IP, alerts)

The Starlink **Public API v2** management endpoints (account/service-line/device info) do
not expose live RF link telemetry. That data comes from a separate, related endpoint - the
**Telemetry Cache API** - which this module also polls (alongside the management calls) to
populate `latency_ms`, `obstruction_percent`, `signal_quality_percent`,
`ping_drop_rate_percent`, `downlink_mbps`, `uplink_mbps`, `terminal_uptime`,
`public_ip_address`, the router `router_*` variables, and the alert-driven feedbacks below.

This requires the **Device telemetry, View** permission on your service account (see
"Getting an API application" above) and a configured **User Terminal / Dish ID** and/or
**Router ID**. If the permission is missing, or no device ID is configured, these fields
stay `N/A` and the alert feedbacks stay inactive - everything else in the module (account,
service line, data usage) keeps working normally regardless.

There is a separate, lower-level **local** dish API on the LAN (typically `192.168.100.1`,
unauthenticated, a different protocol) used by tools like SpaceX's own diagnostic apps -
this module does not use it, since the cloud Telemetry Cache API above already covers the
same data for a remotely-deployed OB truck without needing LAN access to the dish.

## Variables

| Variable | Description |
| --- | --- |
| `arm_status` | `ARMED` or `DISARMED` |
| `arm_seconds_remaining` | Countdown until auto-disarm, or `no timer` when armed indefinitely |
| `write_actions_enabled` | `YES`/`NO`, mirrors the config checkbox |
| `account_number`, `account_name`, `region_code` | Account info |
| `service_line_number`, `service_line_active`, `service_line_nickname` | Service line status |
| `public_ip_enabled` | Whether a dedicated public IP is turned on for the service line |
| `data_used_gb`, `data_used_standard_gb`, `data_cap_gb`, `data_used_percent` | Current billing cycle data usage |
| `device_id`, `device_nickname`, `kit_serial_number`, `dish_serial_number` | User terminal identity |
| `router_id`, `router_nickname` | Router identity |
| `latency_ms`, `obstruction_percent`, `signal_quality_percent`, `ping_drop_rate_percent` | Live dish RF link telemetry |
| `downlink_mbps`, `uplink_mbps`, `terminal_uptime`, `public_ip_address` | Live dish throughput/uptime/IP |
| `alert_obstruction`, `alert_thermal`, `alert_pop_change`, `alert_software_update_pending`, `alert_data_overage`, `alert_alignment_issue` | Live dish alert flags (`YES`/`NO`/`N/A`) |
| `router_uptime`, `router_internet_latency_ms`, `router_dish_latency_ms`, `router_clients` | Live router telemetry |
| `connection_status`, `last_poll_time`, `last_error` | Poll diagnostics |

## Feedbacks

Alongside the safety/data-usage/service-status feedbacks, the live-telemetry set is:
**High Latency Alert**, **Obstruction Alert**, **Thermal / Power Supply Alert**,
**Point-of-Presence Change Alert**, **Data Overage Rate-Limited Alert**, and
**Alignment / Mount Alert**. All of these need the "Device telemetry, View" permission and
stay inactive without it.

## Actions

- **Toggle Arm State** / **Disarm (Panic)** - the safety interlock, with per-press duration
  override and an indefinite-arm option (see above).
- **Refresh Telemetry Now** - read-only, polls immediately.
- **List Available Data Top-Up Products (log only)** - read-only, logs valid Product IDs
  for use in the Top-Up action.
- **List Account Service Lines (log only)** - read-only, logs every service line's number,
  nickname, and active status - use this to find your Default Service Line Number.
- **List User Terminals & Routers (log only)** - read-only, logs every user terminal's ID
  (plus nickname/serial numbers) and any routers bonded to it - use this to find your
  Default User Terminal / Dish ID and Default Router ID.
- **Emergency Priority Data Top-Up**, **Remote Reboot Dish**, **Remote Reboot Router** -
  require Enable Write Actions + ARMED; execute immediately on a single press once armed.
- **Set Dynamic Public IP** - requires Enable Write Actions + ARMED, plus its own optional
  second-press confirmation.

## Presets

The "Telemetry / Read-Only" section's status-display presets (Telemetry Display, Signal
Health, Service Line Status, Data Usage, Public IP, Account Info, Router Status) are **info
only** - pressing them does nothing; their text and colors update automatically as the
connection polls in the background. "List Top-Up Products (log)", "List Service Lines
(log)", and "List Terminals & Routers (log)" are the exceptions in that section: they do
run a (read-only) action when pressed.

## Changing settings on an existing connection

Config field **defaults** (e.g. Telemetry Poll Interval defaulting to 60s) only apply when
you create a **new** connection. If you already added this connection before a default
changed in a module update, your saved value doesn't change on its own - Companion never
silently overwrites a value you (or an earlier version of the module) already saved. Open
the connection's settings and change the field yourself if you want it to match the new
default.
