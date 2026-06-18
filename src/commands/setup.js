'use strict';

const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const embeds = require('../lib/embeds');
const { colors, emoji, divider } = require('../lib/theme');
const db = require('../lib/db');

const CATEGORY = 'Configuration';

function chan(id) { return id ? `<#${id}>` : '`not set`'; }
function role(id) { return id ? `<@&${id}>` : '`not set`'; }
function onoff(v) { return v ? `${emoji.online} enabled` : `${emoji.offline} disabled`; }

module.exports = [
  {
    category: CATEGORY,
    data: new SlashCommandBuilder()
      .setName('setup').setDescription('Configure the bot for this server')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addSubcommand((s) => s.setName('view').setDescription('View the current configuration'))
      .addSubcommand((s) => s.setName('welcome').setDescription('Configure welcome messages')
        .addBooleanOption((o) => o.setName('enabled').setDescription('Enable welcome messages').setRequired(true))
        .addChannelOption((o) => o.setName('channel').setDescription('Channel for welcome messages').addChannelTypes(ChannelType.GuildText))
        .addStringOption((o) => o.setName('message').setDescription('Use {user} {tag} {server} {count} {emoji}')))
      .addSubcommand((s) => s.setName('leave').setDescription('Configure leave messages')
        .addBooleanOption((o) => o.setName('enabled').setDescription('Enable leave messages').setRequired(true))
        .addChannelOption((o) => o.setName('channel').setDescription('Channel for leave messages').addChannelTypes(ChannelType.GuildText))
        .addStringOption((o) => o.setName('message').setDescription('Use {tag} {server} {count}')))
      .addSubcommand((s) => s.setName('autorole').setDescription('Auto-assign a role to new members')
        .addStringOption((o) => o.setName('mode').setDescription('Add, remove or clear').setRequired(true)
          .addChoices({ name: 'add', value: 'add' }, { name: 'remove', value: 'remove' }, { name: 'clear', value: 'clear' }))
        .addRoleOption((o) => o.setName('role').setDescription('Role to add/remove')))
      .addSubcommand((s) => s.setName('tickets').setDescription('Configure the ticket system')
        .addBooleanOption((o) => o.setName('enabled').setDescription('Enable tickets').setRequired(true))
        .addChannelOption((o) => o.setName('category').setDescription('Category where ticket channels are created').addChannelTypes(ChannelType.GuildCategory))
        .addRoleOption((o) => o.setName('support_role').setDescription('Role that can see & handle tickets'))
        .addChannelOption((o) => o.setName('log_channel').setDescription('Channel for ticket logs & transcripts').addChannelTypes(ChannelType.GuildText)))
      .addSubcommand((s) => s.setName('logs').setDescription('Set the moderation log channel')
        .addChannelOption((o) => o.setName('channel').setDescription('Mod-log channel').addChannelTypes(ChannelType.GuildText).setRequired(true))),
    async execute(interaction) {
      const g = db.getGuild(interaction.guild.id);
      const sub = interaction.options.getSubcommand();
      const client = interaction.client;

      if (sub === 'view') {
        const e = embeds.custom(client, colors.brand, `${emoji.gear} ${interaction.guild.name} — Configuration`)
          .setThumbnail(interaction.guild.iconURL() || null)
          .addFields(
            { name: `${emoji.wave} Welcome`, value: `${onoff(g.welcome.enabled)} ${emoji.dot} ${chan(g.welcome.channelId)}`, inline: false },
            { name: `${emoji.door} Leave`, value: `${onoff(g.leave.enabled)} ${emoji.dot} ${chan(g.leave.channelId)}`, inline: false },
            { name: `${emoji.crown} Autorole`, value: g.autorole.roleIds.length ? g.autorole.roleIds.map(role).join(', ') : '`not set`', inline: false },
            { name: `${emoji.ticket} Tickets`, value: `${onoff(g.tickets.enabled)}\nCategory: ${chan(g.tickets.categoryId)} ${emoji.dot} Support: ${role(g.tickets.supportRoleId)} ${emoji.dot} Logs: ${chan(g.tickets.logChannelId)}`, inline: false },
            { name: `${emoji.shield} Mod-log`, value: chan(g.modlog.channelId), inline: true }
          ).setDescription(divider);
        return interaction.reply({ embeds: [e], ephemeral: true });
      }

      if (sub === 'welcome') {
        g.welcome.enabled = interaction.options.getBoolean('enabled');
        const c = interaction.options.getChannel('channel'); if (c) g.welcome.channelId = c.id;
        const m = interaction.options.getString('message'); if (m) g.welcome.message = m;
        db.save();
        return interaction.reply({ embeds: [embeds.success(client, 'Welcome updated', `${onoff(g.welcome.enabled)} ${emoji.dot} ${chan(g.welcome.channelId)}\n\n**Message preview:**\n${g.welcome.message}`)], ephemeral: true });
      }

      if (sub === 'leave') {
        g.leave.enabled = interaction.options.getBoolean('enabled');
        const c = interaction.options.getChannel('channel'); if (c) g.leave.channelId = c.id;
        const m = interaction.options.getString('message'); if (m) g.leave.message = m;
        db.save();
        return interaction.reply({ embeds: [embeds.success(client, 'Leave updated', `${onoff(g.leave.enabled)} ${emoji.dot} ${chan(g.leave.channelId)}\n\n**Message preview:**\n${g.leave.message}`)], ephemeral: true });
      }

      if (sub === 'autorole') {
        const mode = interaction.options.getString('mode');
        const r = interaction.options.getRole('role');
        if (mode === 'clear') { g.autorole.roleIds = []; db.save(); return interaction.reply({ embeds: [embeds.success(client, 'Autorole cleared', 'New members will not receive any role.')], ephemeral: true }); }
        if (!r) return interaction.reply({ embeds: [embeds.error(client, 'Role required', 'Provide a role to add or remove.')], ephemeral: true });
        if (r.managed || r.id === interaction.guild.id) return interaction.reply({ embeds: [embeds.error(client, 'Invalid role', 'That role cannot be used for autorole.')], ephemeral: true });
        if (mode === 'add') {
          if (!g.autorole.roleIds.includes(r.id)) g.autorole.roleIds.push(r.id);
        } else {
          g.autorole.roleIds = g.autorole.roleIds.filter((id) => id !== r.id);
        }
        db.save();
        return interaction.reply({ embeds: [embeds.success(client, 'Autorole updated', g.autorole.roleIds.length ? g.autorole.roleIds.map(role).join(', ') : 'No autoroles set.')], ephemeral: true });
      }

      if (sub === 'tickets') {
        g.tickets.enabled = interaction.options.getBoolean('enabled');
        const cat = interaction.options.getChannel('category'); if (cat) g.tickets.categoryId = cat.id;
        const sr = interaction.options.getRole('support_role'); if (sr) g.tickets.supportRoleId = sr.id;
        const lc = interaction.options.getChannel('log_channel'); if (lc) g.tickets.logChannelId = lc.id;
        db.save();
        return interaction.reply({ embeds: [embeds.success(client, 'Tickets updated', `${onoff(g.tickets.enabled)}\nCategory: ${chan(g.tickets.categoryId)}\nSupport role: ${role(g.tickets.supportRoleId)}\nLogs: ${chan(g.tickets.logChannelId)}\n\nNow run \`/ticket-panel\` to post the panel.`)], ephemeral: true });
      }

      if (sub === 'logs') {
        g.modlog.channelId = interaction.options.getChannel('channel').id;
        db.save();
        return interaction.reply({ embeds: [embeds.success(client, 'Mod-log set', `Moderation actions will be logged in ${chan(g.modlog.channelId)}.`)], ephemeral: true });
      }

    },
  },
];
