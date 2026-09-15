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

## Read-only by default

With **Enable Write Actions** unchecked in the connection config, this module is strictly
read-only: telemetry keeps polling and all variables/feedbacks stay live, but every write
action (top-up, reboot dish, reboot router, set public IP) is refused and logged as a
warning instead of being sent to Starlink.

## Safety interlock ("Arm / Disarm")

Even with write actions enabled, none of the high-consequence actions will fire unless the
connection is **ARMED**:

1. Press **"Toggle Arm State"** (or the "Master Safety Arm Switch" preset). The connection
   arms for a configurable window (default 10s, set via "Safety Interlock Auto-Disarm
   Timeout" in the config) and auto-disarms itself if nothing happens.
2. While armed, `$(starlink:arm_status)` reads `ARMED` and the countdown is available as
   `$(starlink:arm_seconds_remaining)`.
3. Reboot Dish, Reboot Router, Top-Up Data and Set Public IP all check this state before
   doing anything, and re-disarm automatically the moment one of them runs - so a second
   dangerous action always requires a fresh, deliberate re-arm.
4. Each of those actions also has its own "Require a second press to confirm" option
   (on by default): the first press only arms a pending confirmation, the button must be
   pressed again within a few seconds to actually execute.

## Real-time RF telemetry limitation

**Important:** the Starlink **Public API v2** (the cloud/OIDC REST API this module talks
to) is an account-management API - it does not expose live link telemetry such as ping
latency, obstruction percentage, or beam/signal quality for a dish. Those numbers only
exist on the dish's own local, unauthenticated interface on the LAN (typically
`192.168.100.1`), which uses a completely different protocol and is out of scope for a
cloud-credentialed module like this one.

`$(starlink:latency_ms)` and `$(starlink:beam_reliability)`, and the "High Latency / Signal
Drop Alert" feedback, are kept in this module's schema so they're ready to be wired up (for
example by a companion bridge script polling the dish's local interface and pushing values
in), but they will always read `N/A` / stay inactive out of the box.

What this module *does* expose from the Public API: account info, service line activation
state and nickname, dedicated public IP on/off, priority/standard data usage for the
current billing cycle against the recurring allotment, and user terminal / router
identity fields.

## Variables

| Variable | Description |
| --- | --- |
| `arm_status` | `ARMED` or `DISARMED` |
| `arm_seconds_remaining` | Countdown until auto-disarm |
| `write_actions_enabled` | `YES`/`NO`, mirrors the config checkbox |
| `account_number`, `account_name`, `region_code` | Account info |
| `service_line_number`, `service_line_active`, `service_line_nickname` | Service line status |
| `public_ip_enabled` | Whether a dedicated public IP is turned on for the service line |
| `public_ip_address` | Always `N/A` - the literal IP is not returned by the API |
| `data_used_gb`, `data_used_standard_gb`, `data_cap_gb`, `data_used_percent` | Current billing cycle data usage |
| `device_id`, `device_nickname`, `kit_serial_number`, `dish_serial_number` | User terminal identity |
| `router_id`, `router_nickname` | Router identity |
| `latency_ms`, `beam_reliability` | Always `N/A` - see limitation above |
| `connection_status`, `last_poll_time`, `last_error` | Poll diagnostics |

## Actions

- **Toggle Arm State** / **Disarm (Panic)** - the safety interlock.
- **Refresh Telemetry Now** - read-only, polls immediately.
- **List Available Data Top-Up Products (log only)** - read-only, logs valid Product IDs
  for use in the Top-Up action.
- **Emergency Priority Data Top-Up**, **Remote Reboot Dish**, **Remote Reboot Router**,
  **Set Dynamic Public IP** - all require Enable Write Actions + ARMED (+ confirmation by
  default).
