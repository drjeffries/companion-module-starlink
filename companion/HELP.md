# Starlink

Monitors and controls Starlink Business/Enterprise service lines, user terminals (dishes)
and routers via the [Starlink Public API v2](https://starlink.com/api/public/swagger/index.html?urls.primaryName=V2),
with a safety-interlock arming system so a stray button press during a live broadcast can't
reboot the link or trigger a paid data top-up.

## Getting an API application

1. Log in to the Starlink Business admin portal.
2. Create an API application (Account → API keys / API Access) to get a **Client ID** and
   **Client Secret**. This module authenticates with the OIDC `client_credentials` grant -
   no user login flow is needed.
3. Note the **Service Line Number** (`SL-XXXXXX-XXXXX-XX`), **User Terminal ID** and
   **Router ID** you want this connection to default to. You can find these on the admin
   portal, or run the "List Available Data Top-Up Products" action (or watch the log after
   connecting) to confirm the connection is authenticating correctly.

## Polling and rate limits

Starlink API v2 allows **250 requests/minute per account**, shared across every integration
using that account - not exclusive to this connection. This module makes about 5 requests
per poll cycle. The **Telemetry Poll Interval** field defaults to 60 seconds, which uses a
small fraction of that budget and leaves headroom for other tools. You can lower it, but
Starlink's own docs recommend against polling this account/billing API at high frequency -
if you need frequent, low-latency access, they recommend syncing to your own database
instead. The bearer token endpoint has its own, stricter limit (1000 auths/15min per IP);
this module caches and reuses tokens for their full 15-minute lifetime, so normal polling
never comes close to that limit.

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

## Real-time RF telemetry limitation

The Starlink **Public API v2** (the cloud/OIDC REST API this module talks to) is an
account-management API - it does not expose live link telemetry such as ping latency,
obstruction percentage, beam/signal quality, or the literal WAN IP address. Those only
exist on the dish's own local, unauthenticated interface on the LAN, a different protocol
entirely and out of scope for a cloud-credentialed module like this one - so this module
does not surface variables or feedbacks for them.

What this module *does* expose from the Public API: account info, service line activation
state and nickname, dedicated public IP on/off (not the address itself), priority/standard
data usage for the current billing cycle against the recurring allotment, and user
terminal / router identity fields.

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
| `connection_status`, `last_poll_time`, `last_error` | Poll diagnostics |

## Actions

- **Toggle Arm State** / **Disarm (Panic)** - the safety interlock, with per-press duration
  override and an indefinite-arm option (see above).
- **Refresh Telemetry Now** - read-only, polls immediately.
- **List Available Data Top-Up Products (log only)** - read-only, logs valid Product IDs
  for use in the Top-Up action.
- **Emergency Priority Data Top-Up**, **Remote Reboot Dish**, **Remote Reboot Router** -
  require Enable Write Actions + ARMED; execute immediately on a single press once armed.
- **Set Dynamic Public IP** - requires Enable Write Actions + ARMED, plus its own optional
  second-press confirmation.

## Presets

The "Telemetry / Read-Only" section's status-display presets (Telemetry Display, Service
Line Status, Data Usage, Account Info, Router Status) are **info only** - pressing them does
nothing; their text and colors update automatically as the connection polls in the
background. "List Top-Up Products (log)" is the one exception in that section: it does run
a (read-only) action when pressed.
