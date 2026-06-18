'use strict';

const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits, Partials, ActivityType, Events } = require('discord.js');
const config = require('../config');
const db = require('./lib/db');
const embeds = require('./lib/embeds');
const { colors, emoji } = require('./lib/theme');
const { handleInteraction } = require('./interactions');

if (!config.token) {
  console.error('\n[fatal] DISCORD_TOKEN is missing. Copy .env.example to .env and fill it in.\n');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers, // privileged — enable in Dev Portal
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // privileged — needed for transcripts
  ],
  partials: [Partials.GuildMember, Partials.Channel, Partials.Message],
});

// ---- Load commands --------------------------------------------------------
client.commands = new Collection();
function loadCommands() {
  const dir = path.join(__dirname, 'commands');
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.js'))) {
    const mod = require(path.join(dir, file));
    const list = Array.isArray(mod) ? mod : mod.commands ? mod.commands : [mod];
    for (const cmd of list) {
      if (cmd && cmd.data && typeof cmd.execute === 'function') client.commands.set(cmd.data.name, cmd);
      else console.warn(`[load] skipped invalid command in ${file}`);
    }
  }
  console.log(`[load] ${client.commands.size} commands ready`);
}
loadCommands();

const ctx = {};

// ---- Placeholder formatter ------------------------------------------------
function fmt(template, member) {
  const guild = member.guild;
  return String(template || '')
    .replace(/{user}/g, member.toString())
    .replace(/{tag}/g, member.user.tag)
    .replace(/{username}/g, member.user.username)
    .replace(/{server}/g, guild.name)
    .replace(/{count}/g, String(guild.memberCount))
    .replace(/{emoji}/g, emoji.wave);
}

// ---- Events ---------------------------------------------------------------
client.once(Events.ClientReady, async (c) => {
  db.load();
  console.log(`\n☁️  ${config.brand.name} Bot online as ${c.user.tag}`);
  console.log(`   Serving ${c.guilds.cache.size} guild(s) • ${client.commands.size} commands`);

  // ---- Auto-register slash commands on startup ----------------------------
  // No separate deploy step or CLIENT_ID needed — the bot syncs its own
  // commands every boot. Set GUILD_ID for INSTANT registration in that server;
  // otherwise they register globally (can take up to ~1 hour the first time).
  if (config.autoDeploy) {
    try {
      const body = [...client.commands.values()].map((cmd) => cmd.data.toJSON());
      if (config.guildId) {
        await c.application.commands.set(body, config.guildId);
        console.log(`   [deploy] registered ${body.length} commands to guild ${config.guildId} (instant) ✅`);
      } else {
        await c.application.commands.set(body);
        console.log(`   [deploy] registered ${body.length} GLOBAL commands ✅ (set GUILD_ID for instant; global can take up to ~1h)`);
      }
    } catch (err) {
      console.error(`   [deploy] auto-register FAILED: ${err.message}`);
      console.error('   → Make sure the bot was invited with the "applications.commands" scope.');
    }
  }
  console.log('   Reminder: enable the "Server Members" & "Message Content" intents in the Dev Portal.\n');

  const activities = [
    { name: `/help • ${config.brand.name}`, type: ActivityType.Watching },
    { name: `${c.guilds.cache.size} server(s)`, type: ActivityType.Watching },
    { name: 'tickets & moderation', type: ActivityType.Listening },
    { name: 'Cloud Panel game servers', type: ActivityType.Playing },
  ];
  let i = 0;
  const rotate = () => c.user.setActivity(activities[i++ % activities.length]);
  rotate();
  setInterval(rotate, 60000);
});

client.on(Events.InteractionCreate, (interaction) => handleInteraction(interaction, ctx));

client.on(Events.GuildMemberAdd, async (member) => {
  if (member.user.bot) {
    // still allow autorole for bots? skip welcome for bots
  }
  const g = db.getGuild(member.guild.id);

  // Autorole
  if (g.autorole.roleIds.length) {
    const me = member.guild.members.me;
    for (const roleId of g.autorole.roleIds) {
      const role = member.guild.roles.cache.get(roleId);
      if (role && !role.managed && me && role.position < me.roles.highest.position) {
        member.roles.add(role, 'Autorole').catch(() => {});
      }
    }
  }

  // Welcome
  if (g.welcome.enabled && g.welcome.channelId && !member.user.bot) {
    const channel = await member.guild.channels.fetch(g.welcome.channelId).catch(() => null);
    if (channel && channel.isTextBased()) {
      const e = embeds.base(client)
        .setColor(colors.success)
        .setAuthor({ name: `Welcome to ${member.guild.name}!`, iconURL: member.guild.iconURL() || undefined })
        .setDescription(fmt(g.welcome.message, member))
        .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
        .setFooter({ text: `Member #${member.guild.memberCount} • ${config.brand.name}` });
      channel.send({ content: `${member}`, embeds: [e] }).catch(() => {});
    }
  }
});

client.on(Events.GuildMemberRemove, async (member) => {
  const g = db.getGuild(member.guild.id);
  if (!g.leave.enabled || !g.leave.channelId) return;
  const channel = await member.guild.channels.fetch(g.leave.channelId).catch(() => null);
  if (channel && channel.isTextBased()) {
    const e = embeds.base(client)
      .setColor(colors.danger)
      .setAuthor({ name: `Goodbye from ${member.guild.name}`, iconURL: member.guild.iconURL() || undefined })
      .setDescription(fmt(g.leave.message, member))
      .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
      .setFooter({ text: `${member.guild.memberCount} members remain • ${config.brand.name}` });
    channel.send({ embeds: [e] }).catch(() => {});
  }
});

process.on('unhandledRejection', (err) => console.error('[unhandledRejection]', err));
process.on('uncaughtException', (err) => console.error('[uncaughtException]', err));

client.login(config.token);
