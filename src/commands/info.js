'use strict';

const { SlashCommandBuilder, version: djsVersion } = require('discord.js');
const os = require('os');
const embeds = require('../lib/embeds');
const { colors, emoji, divider } = require('../lib/theme');
const { buildHelp } = require('../lib/help');
const config = require('../../config');

const CATEGORY = 'Information';

module.exports = [
  {
    category: CATEGORY,
    data: new SlashCommandBuilder().setName('help').setDescription('Show the beautiful help menu'),
    async execute(interaction) {
      await interaction.reply({ ...buildHelp(interaction.client, interaction.client.commands, null), ephemeral: true });
    },
  },
  {
    category: CATEGORY,
    data: new SlashCommandBuilder().setName('ping').setDescription('Check the bot\'s latency'),
    async execute(interaction) {
      const sent = await interaction.reply({ embeds: [embeds.info(interaction.client, 'Pinging…', `${emoji.loading} measuring latency`)], fetchReply: true, ephemeral: true });
      const rtt = sent.createdTimestamp - interaction.createdTimestamp;
      const ws = Math.max(0, Math.round(interaction.client.ws.ping));
      const e = embeds.custom(interaction.client, colors.success, `${emoji.bolt} Pong!`)
        .addFields(
          { name: `${emoji.net} Round-trip`, value: `\`${rtt}ms\``, inline: true },
          { name: `${emoji.panel} WebSocket`, value: `\`${ws}ms\``, inline: true },
          { name: `${emoji.clock} Uptime`, value: `<t:${Math.floor((Date.now() - process.uptime() * 1000) / 1000)}:R>`, inline: true }
        );
      await interaction.editReply({ embeds: [e] });
    },
  },
  {
    category: CATEGORY,
    data: new SlashCommandBuilder().setName('userinfo').setDescription('Get information about a user')
      .addUserOption((o) => o.setName('user').setDescription('User (defaults to you)')),
    async execute(interaction) {
      const user = interaction.options.getUser('user') || interaction.user;
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      const e = embeds.custom(interaction.client, member?.displayColor || colors.brand, `${emoji.user} ${user.tag}`)
        .setThumbnail(user.displayAvatarURL({ size: 256 }))
        .addFields(
          { name: 'ID', value: `\`${user.id}\``, inline: true },
          { name: 'Bot', value: user.bot ? 'Yes' : 'No', inline: true },
          { name: `${emoji.spark} Account created`, value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: false }
        );
      if (member) {
        e.addFields(
          { name: `${emoji.door} Joined server`, value: member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : '—', inline: false },
          { name: `${emoji.crown} Top role`, value: member.roles.highest?.toString() || '—', inline: true },
          { name: `${emoji.users} Roles (${member.roles.cache.size - 1})`, value: member.roles.cache.filter((r) => r.id !== interaction.guild.id).map((r) => r.toString()).slice(0, 15).join(' ') || 'None' }
        );
        if (member.premiumSinceTimestamp) e.addFields({ name: `${emoji.gem} Boosting since`, value: `<t:${Math.floor(member.premiumSinceTimestamp / 1000)}:R>`, inline: true });
      }
      await interaction.reply({ embeds: [e] });
    },
  },
  {
    category: CATEGORY,
    data: new SlashCommandBuilder().setName('serverinfo').setDescription('Get information about this server'),
    async execute(interaction) {
      const g = interaction.guild;
      await g.members.fetch().catch(() => {});
      const humans = g.members.cache.filter((m) => !m.user.bot).size;
      const bots = g.members.cache.size - humans;
      const owner = await g.fetchOwner().catch(() => null);
      const e = embeds.custom(interaction.client, colors.brand, `${emoji.panel} ${g.name}`)
        .setThumbnail(g.iconURL({ size: 256 }) || null)
        .addFields(
          { name: `${emoji.crown} Owner`, value: owner ? `${owner.user.tag}` : '—', inline: true },
          { name: 'ID', value: `\`${g.id}\``, inline: true },
          { name: `${emoji.spark} Created`, value: `<t:${Math.floor(g.createdTimestamp / 1000)}:R>`, inline: true },
          { name: `${emoji.users} Members`, value: `**${g.memberCount}** total\n${humans} humans ${emoji.dot} ${bots} bots`, inline: true },
          { name: `${emoji.bell} Channels`, value: `${g.channels.cache.size}`, inline: true },
          { name: `${emoji.star} Roles`, value: `${g.roles.cache.size}`, inline: true },
          { name: `${emoji.gem} Boosts`, value: `${g.premiumSubscriptionCount || 0} (Tier ${g.premiumTier})`, inline: true }
        ).setDescription(divider);
      if (g.bannerURL()) e.setImage(g.bannerURL({ size: 1024 }));
      await interaction.reply({ embeds: [e] });
    },
  },
  {
    category: CATEGORY,
    data: new SlashCommandBuilder().setName('avatar').setDescription('Show a user\'s avatar')
      .addUserOption((o) => o.setName('user').setDescription('User (defaults to you)')),
    async execute(interaction) {
      const user = interaction.options.getUser('user') || interaction.user;
      const png = user.displayAvatarURL({ extension: 'png', size: 1024 });
      const e = embeds.custom(interaction.client, colors.brand, `${emoji.user} ${user.username}'s avatar`,
        `[PNG](${png}) ${emoji.dot} [WEBP](${user.displayAvatarURL({ extension: 'webp', size: 1024 })}) ${emoji.dot} [JPG](${user.displayAvatarURL({ extension: 'jpg', size: 1024 })})`)
        .setImage(png);
      await interaction.reply({ embeds: [e] });
    },
  },
  {
    category: CATEGORY,
    data: new SlashCommandBuilder().setName('membercount').setDescription('Show the server member count'),
    async execute(interaction) {
      const g = interaction.guild;
      await interaction.reply({ embeds: [embeds.custom(interaction.client, colors.cyan, `${emoji.users} Member Count`, `**${g.memberCount}** members in **${g.name}** ${emoji.spark}`)] });
    },
  },
  {
    category: CATEGORY,
    data: new SlashCommandBuilder().setName('botinfo').setDescription('Show information about the bot'),
    async execute(interaction) {
      const c = interaction.client;
      const users = c.guilds.cache.reduce((a, g) => a + (g.memberCount || 0), 0);
      const mem = (process.memoryUsage().rss / 1048576).toFixed(0);
      const e = embeds.custom(c, colors.brand, `${emoji.cloud} ${config.brand.name} Bot`, `*${config.brand.tagline}*\n${divider}`)
        .setThumbnail(embeds.brandIcon(c) || null)
        .addFields(
          { name: `${emoji.panel} Servers`, value: `${c.guilds.cache.size}`, inline: true },
          { name: `${emoji.users} Users`, value: `${users}`, inline: true },
          { name: `${emoji.gear} Commands`, value: `${c.commands.size}`, inline: true },
          { name: `${emoji.clock} Uptime`, value: `<t:${Math.floor((Date.now() - process.uptime() * 1000) / 1000)}:R>`, inline: true },
          { name: `${emoji.ram} Memory`, value: `${mem} MB`, inline: true },
          { name: `${emoji.bolt} Ping`, value: `${Math.max(0, Math.round(c.ws.ping))}ms`, inline: true },
          { name: 'Powered by', value: `discord.js v${djsVersion} ${emoji.dot} Node ${process.version} ${emoji.dot} ${os.type()}`, inline: false },
          { name: `${emoji.cloud} Cloud Panel`, value: config.cloudPanel.enabled ? `${emoji.online} connected` : `${emoji.offline} not linked`, inline: true }
        );
      await interaction.reply({ embeds: [e] });
    },
  },
];
