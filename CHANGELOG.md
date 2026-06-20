# Cloud Panel Bot — Changelog

All notable changes to the Cloud Panel Discord bot.

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
