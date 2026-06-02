# Changelog

Notable changes to telegram-bot-kit. The bots pin a tag, e.g.
`github:edriso/telegram-bot-kit#v0.1.1`, so each entry below is a tag a consuming
bot can move to.

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
