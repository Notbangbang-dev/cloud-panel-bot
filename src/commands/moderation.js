'use strict';

const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const embeds = require('../lib/embeds');
const { colors, emoji, divider } = require('../lib/theme');
const { parseDuration, formatDuration } = require('../lib/duration');
const { modLog, tryDM } = require('../lib/log');

const CATEGORY = 'Moderation';

function actionEmbed(client, { color, title, target, moderator, reason, fields = [] }) {
  const e = embeds.custom(client, color, title)
    .addFields(
      { name: `${emoji.user} Target`, value: target ? `${target} \`${target.tag || target.id}\`` : '—', inline: true },
      { name: `${emoji.shield} Moderator`, value: `${moderator}`, inline: true },
      { name: `${emoji.pin} Reason`, value: reason || 'No reason provided', inline: false },
      ...fields
    );
  if (target && target.displayAvatarURL) e.setThumbnail(target.displayAvatarURL());
  return e;
}

/** Hierarchy / safety checks for a target guild member. */
function guardTarget(interaction, member, kind) {
  if (!member) return null;
  if (member.id === interaction.user.id) return `You cannot ${kind} yourself.`;
  if (member.id === interaction.client.user.id) return `I cannot ${kind} myself.`;
  if (member.id === interaction.guild.ownerId) return `You cannot ${kind} the server owner.`;
  const me = interaction.guild.members.me;
  if (member.roles.highest.position >= interaction.member.roles.highest.position && interaction.user.id !== interaction.guild.ownerId)
    return `You can't ${kind} ${member} — their highest role is equal to or above yours.`;
  if (member.roles.highest.position >= me.roles.highest.position)
    return `I can't ${kind} ${member} — their role is higher than mine. Move my role up.`;
  return null;
}

function resolveChannel(interaction) {
  return interaction.options.getChannel('channel') || interaction.channel;
}

module.exports = [
  /* ----------------------------- BAN ----------------------------- */
  {
    category: CATEGORY,
    data: new SlashCommandBuilder()
      .setName('ban').setDescription('Ban a member from the server')
      .addUserOption((o) => o.setName('user').setDescription('User to ban').setRequired(true))
      .addStringOption((o) => o.setName('reason').setDescription('Reason for the ban'))
      .addIntegerOption((o) => o.setName('delete_days').setDescription('Delete this many days of their messages (0-7)').setMinValue(0).setMaxValue(7))
      .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    async execute(interaction) {
      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      const days = interaction.options.getInteger('delete_days') ?? 0;
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      const guard = guardTarget(interaction, member, 'ban');
      if (guard) return interaction.reply({ embeds: [embeds.error(interaction.client, 'Cannot ban', guard)], ephemeral: true });

      await tryDM(user, { embeds: [embeds.custom(interaction.client, colors.danger, `${emoji.hammer} You were banned`, `You have been banned from **${interaction.guild.name}**.\n**Reason:** ${reason}`)] });
      try {
        await interaction.guild.members.ban(user.id, { reason: `${reason} — by ${interaction.user.tag}`, deleteMessageSeconds: days * 86400 });
      } catch (err) {
        return interaction.reply({ embeds: [embeds.error(interaction.client, 'Ban failed', err.message)], ephemeral: true });
      }
      const e = actionEmbed(interaction.client, { color: colors.danger, title: `${emoji.hammer} Member Banned`, target: user, moderator: interaction.user, reason, fields: days ? [{ name: `${emoji.broom} Messages purged`, value: `${days} day(s)`, inline: true }] : [] });
      await interaction.reply({ embeds: [e] });
      modLog(interaction.guild, e);
    },
  },

  /* ----------------------------- UNBAN ----------------------------- */
  {
    category: CATEGORY,
    data: new SlashCommandBuilder()
      .setName('unban').setDescription('Unban a user by their ID')
      .addStringOption((o) => o.setName('user_id').setDescription('The user ID to unban').setRequired(true))
      .addStringOption((o) => o.setName('reason').setDescription('Reason'))
      .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    async execute(interaction) {
      const id = interaction.options.getString('user_id');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      if (!/^\d{16,20}$/.test(id)) return interaction.reply({ embeds: [embeds.error(interaction.client, 'Invalid ID', 'Provide a valid user ID.')], ephemeral: true });
      try {
        await interaction.guild.bans.remove(id, `${reason} — by ${interaction.user.tag}`);
      } catch {
        return interaction.reply({ embeds: [embeds.error(interaction.client, 'Unban failed', 'That user is not banned, or the ID is wrong.')], ephemeral: true });
      }
      const e = embeds.custom(interaction.client, colors.success, `${emoji.success} User Unbanned`, `<@${id}> (\`${id}\`) has been unbanned.\n**Reason:** ${reason}`);
      await interaction.reply({ embeds: [e] });
      modLog(interaction.guild, e);
    },
  },

  /* ----------------------------- KICK ----------------------------- */
  {
    category: CATEGORY,
    data: new SlashCommandBuilder()
      .setName('kick').setDescription('Kick a member from the server')
      .addUserOption((o) => o.setName('user').setDescription('User to kick').setRequired(true))
      .addStringOption((o) => o.setName('reason').setDescription('Reason for the kick'))
      .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    async execute(interaction) {
      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (!member) return interaction.reply({ embeds: [embeds.error(interaction.client, 'Not here', 'That user is not in this server.')], ephemeral: true });
      const guard = guardTarget(interaction, member, 'kick');
      if (guard) return interaction.reply({ embeds: [embeds.error(interaction.client, 'Cannot kick', guard)], ephemeral: true });

      await tryDM(user, { embeds: [embeds.custom(interaction.client, colors.warning, `${emoji.boot} You were kicked`, `You have been kicked from **${interaction.guild.name}**.\n**Reason:** ${reason}`)] });
      try { await member.kick(`${reason} — by ${interaction.user.tag}`); }
      catch (err) { return interaction.reply({ embeds: [embeds.error(interaction.client, 'Kick failed', err.message)], ephemeral: true }); }

      const e = actionEmbed(interaction.client, { color: colors.warning, title: `${emoji.boot} Member Kicked`, target: user, moderator: interaction.user, reason });
      await interaction.reply({ embeds: [e] });
      modLog(interaction.guild, e);
    },
  },

  /* ----------------------------- TIMEOUT ----------------------------- */
  {
    category: CATEGORY,
    data: new SlashCommandBuilder()
      .setName('timeout').setDescription('Timeout (mute) a member for a duration')
      .addUserOption((o) => o.setName('user').setDescription('User to timeout').setRequired(true))
      .addStringOption((o) => o.setName('duration').setDescription('e.g. 10m, 1h30m, 2d (max 28d)').setRequired(true))
      .addStringOption((o) => o.setName('reason').setDescription('Reason'))
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction) {
      const user = interaction.options.getUser('user');
      const durStr = interaction.options.getString('duration');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      const ms = parseDuration(durStr);
      if (!ms || ms < 5000) return interaction.reply({ embeds: [embeds.error(interaction.client, 'Invalid duration', 'Try formats like `10m`, `1h`, `2d`. Minimum 5s.')], ephemeral: true });
      if (ms > 28 * 86400000) return interaction.reply({ embeds: [embeds.error(interaction.client, 'Too long', 'Timeouts can be at most 28 days.')], ephemeral: true });
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (!member) return interaction.reply({ embeds: [embeds.error(interaction.client, 'Not here', 'That user is not in this server.')], ephemeral: true });
      const guard = guardTarget(interaction, member, 'timeout');
      if (guard) return interaction.reply({ embeds: [embeds.error(interaction.client, 'Cannot timeout', guard)], ephemeral: true });

      try { await member.timeout(ms, `${reason} — by ${interaction.user.tag}`); }
      catch (err) { return interaction.reply({ embeds: [embeds.error(interaction.client, 'Timeout failed', err.message)], ephemeral: true }); }
      await tryDM(user, { embeds: [embeds.custom(interaction.client, colors.warning, `${emoji.mute} You were timed out`, `You have been timed out in **${interaction.guild.name}** for **${formatDuration(ms)}**.\n**Reason:** ${reason}`)] });

      const until = Math.floor((Date.now() + ms) / 1000);
      const e = actionEmbed(interaction.client, { color: colors.warning, title: `${emoji.mute} Member Timed Out`, target: user, moderator: interaction.user, reason, fields: [{ name: `${emoji.clock} Duration`, value: formatDuration(ms), inline: true }, { name: `${emoji.bell} Expires`, value: `<t:${until}:R>`, inline: true }] });
      await interaction.reply({ embeds: [e] });
      modLog(interaction.guild, e);
    },
  },

  /* ----------------------------- UNTIMEOUT ----------------------------- */
  {
    category: CATEGORY,
    data: new SlashCommandBuilder()
      .setName('untimeout').setDescription('Remove a member\'s timeout')
      .addUserOption((o) => o.setName('user').setDescription('User to un-timeout').setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction) {
      const user = interaction.options.getUser('user');
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (!member) return interaction.reply({ embeds: [embeds.error(interaction.client, 'Not here', 'That user is not in this server.')], ephemeral: true });
      if (!member.isCommunicationDisabled()) return interaction.reply({ embeds: [embeds.warn(interaction.client, 'Not timed out', 'That member is not currently timed out.')], ephemeral: true });
      try { await member.timeout(null, `Timeout removed by ${interaction.user.tag}`); }
      catch (err) { return interaction.reply({ embeds: [embeds.error(interaction.client, 'Failed', err.message)], ephemeral: true }); }
      const e = embeds.custom(interaction.client, colors.success, `${emoji.unmute} Timeout Removed`, `${user}'s timeout has been lifted by ${interaction.user}.`);
      await interaction.reply({ embeds: [e] });
      modLog(interaction.guild, e);
    },
  },

  /* ----------------------------- LOCK ----------------------------- */
  {
    category: CATEGORY,
    data: new SlashCommandBuilder()
      .setName('lock').setDescription('Lock a channel (prevent @everyone from sending messages)')
      .addChannelOption((o) => o.setName('channel').setDescription('Channel to lock (defaults to current)').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
      .addStringOption((o) => o.setName('reason').setDescription('Reason'))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    async execute(interaction) {
      const channel = resolveChannel(interaction);
      const reason = interaction.options.getString('reason') || 'No reason provided';
      try {
        await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false }, { reason: `Locked by ${interaction.user.tag}: ${reason}` });
      } catch (err) { return interaction.reply({ embeds: [embeds.error(interaction.client, 'Lock failed', err.message)], ephemeral: true }); }
      const e = embeds.custom(interaction.client, colors.danger, `${emoji.lock} Channel Locked`, `${channel} has been locked.\n**Reason:** ${reason}`);
      if (channel.id !== interaction.channelId) await interaction.reply({ embeds: [embeds.success(interaction.client, 'Locked', `${channel} is now locked.`)], ephemeral: true });
      else await interaction.reply({ embeds: [e] });
      if (channel.id !== interaction.channelId) channel.send({ embeds: [e] }).catch(() => {});
      modLog(interaction.guild, e);
    },
  },

  /* ----------------------------- UNLOCK ----------------------------- */
  {
    category: CATEGORY,
    data: new SlashCommandBuilder()
      .setName('unlock').setDescription('Unlock a previously locked channel')
      .addChannelOption((o) => o.setName('channel').setDescription('Channel to unlock (defaults to current)').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    async execute(interaction) {
      const channel = resolveChannel(interaction);
      try {
        await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: null }, { reason: `Unlocked by ${interaction.user.tag}` });
      } catch (err) { return interaction.reply({ embeds: [embeds.error(interaction.client, 'Unlock failed', err.message)], ephemeral: true }); }
      const e = embeds.custom(interaction.client, colors.success, `${emoji.unlock} Channel Unlocked`, `${channel} has been unlocked.`);
      if (channel.id !== interaction.channelId) { await interaction.reply({ embeds: [embeds.success(interaction.client, 'Unlocked', `${channel} is now unlocked.`)], ephemeral: true }); channel.send({ embeds: [e] }).catch(() => {}); }
      else await interaction.reply({ embeds: [e] });
      modLog(interaction.guild, e);
    },
  },

  /* ----------------------------- SLOWMODE ----------------------------- */
  {
    category: CATEGORY,
    data: new SlashCommandBuilder()
      .setName('slowmode').setDescription('Set channel slowmode (rate limit)')
      .addIntegerOption((o) => o.setName('seconds').setDescription('Seconds between messages (0 to disable, max 21600)').setRequired(true).setMinValue(0).setMaxValue(21600))
      .addChannelOption((o) => o.setName('channel').setDescription('Channel (defaults to current)').addChannelTypes(ChannelType.GuildText))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    async execute(interaction) {
      const channel = resolveChannel(interaction);
      const seconds = interaction.options.getInteger('seconds');
      try { await channel.setRateLimitPerSecond(seconds, `By ${interaction.user.tag}`); }
      catch (err) { return interaction.reply({ embeds: [embeds.error(interaction.client, 'Slowmode failed', err.message)], ephemeral: true }); }
      const e = embeds.custom(interaction.client, colors.info, `${emoji.snail} Slowmode Updated`, seconds ? `${channel} now has a **${formatDuration(seconds * 1000)}** slowmode.` : `Slowmode disabled in ${channel}.`);
      await interaction.reply({ embeds: [e] });
      modLog(interaction.guild, e);
    },
  },

  /* ----------------------------- PURGE ----------------------------- */
  {
    category: CATEGORY,
    data: new SlashCommandBuilder()
      .setName('purge').setDescription('Bulk-delete recent messages')
      .addIntegerOption((o) => o.setName('amount').setDescription('How many messages (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
      .addUserOption((o) => o.setName('user').setDescription('Only delete messages from this user'))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    async execute(interaction) {
      const amount = interaction.options.getInteger('amount');
      const user = interaction.options.getUser('user');
      await interaction.deferReply({ ephemeral: true });
      let messages = await interaction.channel.messages.fetch({ limit: 100 }).catch(() => null);
      if (!messages) return interaction.editReply({ embeds: [embeds.error(interaction.client, 'Failed', 'Could not fetch messages.')] });
      let list = [...messages.values()].filter((m) => !m.pinned && Date.now() - m.createdTimestamp < 14 * 86400000);
      if (user) list = list.filter((m) => m.author.id === user.id);
      list = list.slice(0, amount);
      if (!list.length) return interaction.editReply({ embeds: [embeds.warn(interaction.client, 'Nothing to delete', 'No deletable messages found (messages older than 14 days can\'t be bulk-deleted).')] });
      const deleted = await interaction.channel.bulkDelete(list, true).catch(() => null);
      const count = deleted ? deleted.size : 0;
      const e = embeds.custom(interaction.client, colors.info, `${emoji.broom} Messages Purged`, `Deleted **${count}** message(s)${user ? ` from ${user}` : ''} in ${interaction.channel}.`);
      await interaction.editReply({ embeds: [e] });
      modLog(interaction.guild, e.setFooter({ text: `Purged by ${interaction.user.tag}` }));
    },
  },
];
