'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../lib/embeds');
const { colors, emoji } = require('../lib/theme');
const db = require('../lib/db');
const { modLog, tryDM } = require('../lib/log');

const CATEGORY = 'Moderation';

module.exports = [
  {
    category: CATEGORY,
    data: new SlashCommandBuilder()
      .setName('warn').setDescription('Warn a member')
      .addUserOption((o) => o.setName('user').setDescription('User to warn').setRequired(true))
      .addStringOption((o) => o.setName('reason').setDescription('Reason for the warning').setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction) {
      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason');
      if (user.bot) return interaction.reply({ embeds: [embeds.error(interaction.client, 'Cannot warn', 'You cannot warn a bot.')], ephemeral: true });
      const entry = db.addWarning(interaction.guild.id, user.id, interaction.user.id, reason);
      const total = db.getWarnings(interaction.guild.id, user.id).length;
      await tryDM(user, { embeds: [embeds.custom(interaction.client, colors.warning, `${emoji.warn} You were warned`, `You received a warning in **${interaction.guild.name}**.\n**Reason:** ${reason}\nYou now have **${total}** warning(s).`)] });
      const e = embeds.custom(interaction.client, colors.warning, `${emoji.warn} Member Warned`)
        .addFields(
          { name: `${emoji.user} User`, value: `${user} \`${user.tag}\``, inline: true },
          { name: `${emoji.shield} Moderator`, value: `${interaction.user}`, inline: true },
          { name: `${emoji.star} Total warnings`, value: `${total}`, inline: true },
          { name: `${emoji.pin} Reason`, value: reason },
          { name: 'Case ID', value: `\`${entry.id}\``, inline: true }
        ).setThumbnail(user.displayAvatarURL());
      await interaction.reply({ embeds: [e] });
      modLog(interaction.guild, e);
    },
  },
  {
    category: CATEGORY,
    data: new SlashCommandBuilder()
      .setName('warnings').setDescription('View a member\'s warnings')
      .addUserOption((o) => o.setName('user').setDescription('User to look up').setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction) {
      const user = interaction.options.getUser('user');
      const list = db.getWarnings(interaction.guild.id, user.id);
      if (!list.length) return interaction.reply({ embeds: [embeds.info(interaction.client, 'No warnings', `${user} has a clean record. ${emoji.success}`)], ephemeral: true });
      const e = embeds.custom(interaction.client, colors.warning, `${emoji.warn} Warnings for ${user.username}`, `**${list.length}** warning(s) on record.`)
        .setThumbnail(user.displayAvatarURL());
      list.slice(-15).forEach((w, i) => {
        e.addFields({ name: `#${i + 1} ${emoji.dot} \`${w.id}\` ${emoji.dot} <t:${Math.floor(new Date(w.at).getTime() / 1000)}:R>`, value: `**By:** <@${w.modId}>\n**Reason:** ${w.reason}` });
      });
      await interaction.reply({ embeds: [e], ephemeral: true });
    },
  },
  {
    category: CATEGORY,
    data: new SlashCommandBuilder()
      .setName('delwarn').setDescription('Delete a single warning by case ID')
      .addUserOption((o) => o.setName('user').setDescription('User').setRequired(true))
      .addStringOption((o) => o.setName('case_id').setDescription('The warning case ID').setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction) {
      const user = interaction.options.getUser('user');
      const id = interaction.options.getString('case_id');
      const ok = db.removeWarning(interaction.guild.id, user.id, id);
      if (!ok) return interaction.reply({ embeds: [embeds.error(interaction.client, 'Not found', `No warning with ID \`${id}\` for ${user}.`)], ephemeral: true });
      const e = embeds.custom(interaction.client, colors.success, `${emoji.success} Warning Removed`, `Removed warning \`${id}\` from ${user}.`);
      await interaction.reply({ embeds: [e] });
      modLog(interaction.guild, e);
    },
  },
  {
    category: CATEGORY,
    data: new SlashCommandBuilder()
      .setName('clearwarnings').setDescription('Clear ALL warnings for a member')
      .addUserOption((o) => o.setName('user').setDescription('User').setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction) {
      const user = interaction.options.getUser('user');
      const n = db.clearWarnings(interaction.guild.id, user.id);
      if (!n) return interaction.reply({ embeds: [embeds.warn(interaction.client, 'Nothing to clear', `${user} has no warnings.`)], ephemeral: true });
      const e = embeds.custom(interaction.client, colors.success, `${emoji.success} Warnings Cleared`, `Cleared **${n}** warning(s) from ${user}.`);
      await interaction.reply({ embeds: [e] });
      modLog(interaction.guild, e);
    },
  },
];
