# companion-module-starlink

A [Bitfocus Companion](https://bitfocus.io/companion) module for the [Starlink Public API v2](https://starlink.com/api/public/swagger/index.html?urls.primaryName=V2), built for live broadcast / OB truck use: satellite link and account monitoring on a Stream Deck, with a safety-interlock arming system that gates every high-consequence write action (reboot dish, reboot router, data top-up, set public IP).

See [companion/HELP.md](companion/HELP.md) for setup and usage instructions, including an important note on what the Public API v2 does and does not expose (it has no live RF/latency/obstruction telemetry - see that file for details).

## Development

```bash
npm install
npm run build   # compile TypeScript to dist/
npm run lint    # eslint + prettier
npm run dev     # tsc --watch
npm run package # build + produce the installable .tgz via companion-module-build
```

To load the built module into a local Companion instance, point Companion's
"Developer modules" path at this directory (Companion reads `companion/manifest.json` and
`dist/main.js` after `npm run build`).

## Project layout

- `src/main.ts` - `ModuleInstance` (lifecycle: init/destroy/configUpdated) and the `ModuleSchema` tying config/secrets/actions/feedbacks/variables together.
- `src/config.ts` - connection config fields (`ModuleConfig`) and the `clientSecret` secret field (`ModuleSecrets`).
- `src/api.ts` - `StarlinkApiClient`: OIDC `client_credentials` token management (with auto-refresh) and typed REST calls.
- `src/starlink-types.ts` - hand-trimmed TypeScript shapes for the Starlink API responses this module uses.
- `src/interlock.ts` - `SafetyInterlock` (arm/disarm state machine with auto-disarm + flashing feedback) and `ConfirmGate` (two-press confirmation).
- `src/state.ts` / `src/polling.ts` - the telemetry snapshot and the poll loop that fills it in.
- `src/actions.ts`, `src/feedbacks.ts`, `src/variables.ts`, `src/presets.ts` - the Companion-facing definitions.
- `src/upgrades.ts` - config/action/feedback migration scripts (empty for the initial release).
