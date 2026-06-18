# Cloud Panel Bot ☁️

> The all-in-one, **Cloud Panel-themed** Discord bot — moderation, a gorgeous
> ticket system, welcome/leave cards, autorole, a beautiful `/help`, and **live
> control of your Cloud Panel game servers** right from Discord.
>
> *Deploy. Scale. Dominate.*

Every response is a slick, branded embed with a consistent cyan→indigo→violet
Cloud Panel look.

---

## ✨ Features

**🛡️ Moderation**
- `/ban` · `/unban` · `/kick` · `/timeout` · `/untimeout`
- `/lock` · `/unlock` · `/slowmode` · `/purge`
- Full warning system: `/warn` · `/warnings` · `/delwarn` · `/clearwarnings`
- Role-hierarchy & safety checks, DM notifications, and a mod-log channel.

**🎫 Tickets**
- `/ticket-panel` posts a stunning panel with a category dropdown.
- Members open private ticket channels (General, Billing, Server Help, Report).
- **Claim**, **Transcript** (beautiful themed HTML export), and **Close** buttons.
- `/ticket add|remove|rename|close`, support-role pings, transcript to log + DM.

**👋 Welcome / Leave + 👑 Autorole**
- Themed welcome & leave embeds with avatar and member count.
- Placeholders: `{user} {tag} {username} {server} {count} {emoji}`.
- Auto-assign one or more roles to new members.

**☁️ Cloud Panel control** (the killer feature)
- `/server list` — every server with live status, CPU, RAM, disk.
- `/server status <name>` — detailed live resource embed.
- `/server power <name> <start|stop|restart|kill>`.
- `/server send <name> <command>` — run a console command.
- Restrict to a role with `/setup cloudpanel`.

**ℹ️ Info & utility**
- `/help` (interactive category menu) · `/ping` · `/botinfo`
- `/userinfo` · `/serverinfo` · `/avatar` · `/membercount`
- `/say` · `/announce` · `/embed` (modal-based embed builder)

**⚙️ Configuration** — one command does it all: `/setup` with
`view`, `welcome`, `leave`, `autorole`, `tickets`, `logs`, `cloudpanel`.

---

## 🚀 Setup

### 1. Create the application
1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) → **New Application**.
2. **Bot** tab → **Reset Token** → copy the token.
3. Still on the **Bot** tab, enable these **Privileged Gateway Intents**:
   - ✅ **Server Members Intent** (welcome / leave / autorole)
   - ✅ **Message Content Intent** (ticket transcripts)
4. **General Information** → copy the **Application ID** (this is `CLIENT_ID`).

### 2. Invite the bot
Use this URL (replace `CLIENT_ID`). Administrator is easiest:

```
https://discord.com/oauth2/authorize?client_id=CLIENT_ID&permissions=8&scope=bot%20applications.commands
```

Prefer least-privilege? Grant: Manage Server, Manage Roles, Manage Channels,
Kick, Ban, Timeout (Moderate Members), Manage Messages, Embed Links, Attach
Files, Read Message History. **Important:** drag the bot's role **above** any
roles it must moderate.

### 3. Configure & run

```bash
cd cloud-panel-bot
npm install
copy .env.example .env      # (Windows)   |   cp .env.example .env  (macOS/Linux)
# edit .env: DISCORD_TOKEN, CLIENT_ID, (optional GUILD_ID for instant commands)
npm run check               # validate everything offline (no token needed)
npm run deploy              # register slash commands
npm start                   # start the bot
```

Set `GUILD_ID` to your server's ID during development so commands appear
**instantly**. Leave it blank for global commands (can take ~1 hour).

---

## ☁️ Linking Cloud Panel

In `.env`:

```
CLOUDPANEL_URL=http://your-server-ip:8080
CLOUDPANEL_EMAIL=your-admin@example.com      # the admin you created during Cloud Panel setup
CLOUDPANEL_PASSWORD=your-admin-password
# …or a long-lived token instead of email/password:
CLOUDPANEL_TOKEN=
```

Then in Discord run `/setup cloudpanel admin_role:@Staff` to choose who may use
`/server` commands (server managers always can). The bot logs into the panel's
REST API and caches its token, re-authenticating automatically.

---

## 🗂️ Project structure

```
src/
  index.js            Client, command loader, welcome/leave/autorole, presence
  interactions.js     Routes commands, buttons, select menus & modals
  deploy-commands.js  Registers slash commands
  check.js            Offline validator (npm run check)
  lib/
    theme.js          Colors & emoji
    embeds.js         Branded embed builders
    db.js             Per-guild JSON store (settings, tickets, warnings)
    duration.js       "10m"/"1h30m" parsing
    cloudpanel.js     Cloud Panel REST client
    tickets.js        Ticket panel, create/claim/close + HTML transcripts
    help.js           Interactive /help builder
    log.js            Mod-log + DM helpers
  commands/
    moderation.js  warnings.js  tickets.js  setup.js  cloudpanel.js  info.js  misc.js
```

Data is stored in `data/store.json` (per-guild config, open tickets, warnings).

---

## 🧰 Hosting

Runs anywhere Node 18+ runs. On a VPS, keep it alive with **pm2**:

```bash
npm i -g pm2
pm2 start src/index.js --name cloud-panel-bot
pm2 save && pm2 startup
```

…or a systemd service, the same way the Cloud Panel itself is deployed.

## License

MIT
