# telegram-bot-kit

The shared kernel for the edriso Telegram Quran bots ([ayah](https://github.com/edriso/ayah),
[tilawah](https://github.com/edriso/tilawah)). It exists so a fix to this code lands in **both**
bots from one place, instead of drifting between byte-identical copies.

## What's in it

| Module     | Exports                                                                                                        |
| ---------- | -------------------------------------------------------------------------------------------------------------- |
| `types`    | `DeliverySchedule`, `LocalContext`                                                                             |
| `days`     | `ALL_DAYS`, `NO_DAYS`, `isDayActive`, `withDayOn`, `withDayOff`, `toggleDay`, `activeDaysList`, `maskFromDays` |
| `schedule` | `getLocalContext`, `scheduledMinutes`, `dueLocalDate` (timezone/DST-aware, all pure)                           |
| `arabic`   | `toArabicDigits`, `toAsciiDigits`                                                                              |
| `env`      | `loadEnv` (finds the consuming bot's root `.env`)                                                              |
| `logger`   | `logger` (timestamped JSON-ish console logger)                                                                 |
| `send`     | `sendMessage`, `sendMessages`, `SendResult` (plain-text grammY wrapper with 403/429 handling)                  |

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
  "telegram-bot-kit": "github:edriso/telegram-bot-kit#v0.1.1"
}
```

> The repo must be **public** so the bots' CI and Docker builds can fetch it without auth.

To release a change: edit here, `pnpm check`, bump the `version`, add a `CHANGELOG.md` entry,
commit, and push a new tag (`vX.Y.Z`).

Both bots already run **Renovate**, configured to watch this repo's tags. Soon after you push the
tag it opens an "update telegram-bot-kit to vX.Y.Z" PR in each bot, the bot's CI (`pnpm check`, which
runs on the PR) gates it green, and merging the PR deploys that bot. So a fix here reaches both bots
with two clicks: merge ayah's PR, merge tilawah's. (The "Dependency Dashboard" issue Renovate keeps
open in each bot is its permanent control panel — leave it open.)

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
