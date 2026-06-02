# CLAUDE.md

Notes for anyone (human or AI) working in this repo. See `README.md` for the
full picture; this is the short "how to work here" version.

## What this is

The shared kernel for the edriso Telegram Quran bots (`ayah`, `tilawah`). Code
that was byte-identical across both bots lives here once, so a fix lands in both
from a single place. It is consumed as **TypeScript source** (the bots run it
through `tsx` like their own code, and `tsc` resolves it via `moduleResolution:
bundler`) — there is **no build step** and no `dist/`.

## Rules

1. **Keep it generic and leaf-level.** Only put code here that both bots use
   verbatim: timezone/schedule math, the active-day bitmask, Arabic-Indic
   digits, the `.env` loader, the logger, the plain-text send wrapper. No
   per-bot domain logic (pages vs ayat, Prisma models, the delivery
   orchestration) — that legitimately differs and stays in each bot.
2. **`grammy` is a peer dependency**, never a direct one, so the kit uses the
   bot's own grammY instance (one version, matching types).
3. **Pure by default.** Everything is pure except `env` (reads a file),
   `logger` (writes the console), and `send` (calls grammY). Keep new code in
   that spirit; `schedule`/`days`/`arabic` must stay clock-free and testable.
4. **Every export is tested.** Add a vitest test next to new code.

## Release flow

```bash
pnpm install
pnpm check          # typecheck + lint + test (all green before you tag)
```

Then bump `version` in `package.json`, add a `CHANGELOG.md` entry, commit, and
tag (`git tag vX.Y.Z && git push origin vX.Y.Z`). The bots pin a tag
(`github:edriso/telegram-bot-kit#vX.Y.Z`); Renovate opens a bump PR in each bot,
its CI runs, and merging deploys. **Keep the repo public** so the bots' CI and
Docker builds can fetch the tarball without auth.
