# Changelog

Notable changes to telegram-bot-kit. The bots pin a tag, e.g.
`github:edriso/telegram-bot-kit#v0.1.1`, so each entry below is a tag a consuming
bot can move to.

## v0.1.2

- **Fix: a 403 on the post-429 retry now returns `'blocked'`, not `'failed'`.**
  `sendMessage` retries once after a rate-limit (429). The retry was a separate
  code path that mapped _any_ error — including a 403 (user blocked the bot) —
  to `'failed'`, so a user who blocked the bot during a burst was never marked
  blocked and got retried for ever. Both attempts now classify errors the same
  way. Also tidied the over-cap-retry_after path (gives up with a clear log)
  and added a `send.test.ts` (the module was previously untested).

## v0.1.1

- Docs: add this changelog. No code or behaviour change. (Also the first patch
  release, used to validate the Renovate auto-bump loop into the ayah and
  tilawah bots end to end.)

## v0.1.0

- Initial shared kernel extracted from the ayah and tilawah bots: timezone /
  schedule math (`schedule`, `days`, `DeliverySchedule`, `LocalContext`),
  Arabic-Indic digit helpers (`arabic`), the root `.env` loader (`env`), the
  console `logger`, and the plain-text grammY send wrapper with 403/429 handling
  (`send`). Shipped as TypeScript source; no build step.
