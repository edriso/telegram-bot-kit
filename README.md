# telegram-bot-kit

The shared kernel for the edriso Telegram Quran bots ([ayah](https://github.com/edriso/ayah),
[tilawah](https://github.com/edriso/tilawah)). It exists so a fix to this code lands in **both**
bots from one place, instead of drifting between byte-identical copies.

## What's in it

| Module       | Exports                                                                                   |
| ------------ | ----------------------------------------------------------------------------------------- |
| `types`      | `DeliverySchedule`, `LocalContext`                                                         |
| `days`       | `ALL_DAYS`, `NO_DAYS`, `isDayActive`, `withDayOn`, `withDayOff`, `toggleDay`, `activeDaysList`, `maskFromDays` |
| `schedule`   | `getLocalContext`, `scheduledMinutes`, `dueLocalDate` (timezone/DST-aware, all pure)       |
| `arabic`     | `toArabicDigits`, `toAsciiDigits`                                                          |
| `env`        | `loadEnv` (finds the consuming bot's root `.env`)                                          |
| `logger`     | `logger` (timestamped JSON-ish console logger)                                             |
| `send`       | `sendMessage`, `sendMessages`, `SendResult` (plain-text grammY wrapper with 403/429 handling) |

Everything is pure except `env` (reads a `.env`), `logger` (writes to the console), and `send`
(calls grammY). `grammy` is a **peer dependency** so the kit uses the bot's own grammY instance.

## How it's consumed

The bots run from TypeScript source via `tsx` (no build step), so this package ships **`.ts`
source** too — `exports` points at `src/index.ts`, and the consuming bot's `tsx` (runtime) and
`tsc` (`moduleResolution: bundler`, typecheck) handle it like their own files. No `dist/`, no
build.

Each bot depends on a pinned tag:

```jsonc
// ayah / tilawah package.json
"dependencies": {
  "telegram-bot-kit": "github:edriso/telegram-bot-kit#v0.1.0"
}
```

> The repo must be **public** so the bots' CI and Docker builds can fetch it without auth.

To release a change: edit here, `pnpm check`, bump the version, tag (`v0.1.1`), push the tag, then
point both bots at the new tag (a Renovate/Dependabot config can open those bump PRs automatically).

## Develop

```bash
pnpm install
pnpm check   # typecheck + lint + test
```

## Not here (yet)

The per-bot delivery orchestration (`deliver.ts`, the bot command handlers) and Prisma-coupled
code (`client.ts`, `scheduler.ts`) legitimately differ between the two bots (pages vs ayat,
partial-send, cron wiring), so they stay in each bot. Candidates to move here later: the bidi
`ltr()` helper and the `parseDbUrl` part of the client factory.
