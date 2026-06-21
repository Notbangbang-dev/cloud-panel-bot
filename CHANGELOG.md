# Cloud Panel Bot — Changelog

All notable changes to the Cloud Panel Discord bot.

## [1.1.2] — 2026-06-21

### ✨ Changed
- **`/changelog`** now shows the **Cloud Panel v2.0.0 "Ascension"** highlights
  (daily rewards, achievements & XP, server pets, themes & avatars, self-service
  resources, panel analytics, view-as-user, maintenance & banner).

## [1.1.1] — 2026-06-20

### 🔒 Security

- **Server-side permission re-check.** Every slash command now re-verifies the
  caller's permissions in the interaction handler before running, instead of
  relying only on Discord's *default* member permissions (which a guild admin can
  override in **Server Settings → Integrations**). Privileged commands
  (ban / kick / timeout / purge / lock / say / announce / embed …) are now gated
  even if those defaults are loosened.

### 🧹 Changed

- Removed the unused `CLOUDPANEL_URL` / `CLOUDPANEL_TOKEN` / `CLOUDPANEL_EMAIL` /
  `CLOUDPANEL_PASSWORD` fields from `.env.example`. The bot does **not** control
  Cloud Panel game servers yet, so it never asks for your panel admin password.

### ℹ️ Notes

- **Restart the bot after updating** so it reloads the command files.

## [1.1.0] — 2026-06-20

### ✨ Added
- **`/changelog`** — a new Information command that posts the latest Cloud Panel
  release highlights (v1.9.x) as a themed embed, so you can share what's new
  straight into your server.
- This brings the bot to **27 slash commands**.

### ℹ️ Notes
- **Restart the bot after updating** so it reloads the command files. The boot
  log should then read `27 commands ready`.
- With `GUILD_ID` set, commands re-register **instantly** in that guild; without
  it, global registration can take up to ~1 hour to appear.

## [1.0.0] — initial release

- **26 slash commands** across Moderation (ban, unban, kick, timeout, untimeout,
  lock, unlock, slowmode, purge, warn, warnings, delwarn, clearwarnings),
  Tickets (ticket-panel, ticket) with HTML transcripts, Configuration (setup),
  and Information (help, ping, userinfo, serverinfo, avatar, membercount,
  botinfo, say, announce, embed).
- Welcome / leave messages + autorole on join.
- Auto-registers slash commands on startup (no separate deploy step / CLIENT_ID).
