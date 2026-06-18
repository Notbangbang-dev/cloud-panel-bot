'use strict';

const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const embeds = require('../lib/embeds');
const { emoji } = require('../lib/theme');
const db = require('../lib/db');
const tickets = require('../lib/tickets');

const CATEGORY = 'Tickets';

module.exports = [
  {
    category: CATEGORY,
    data: new SlashCommandBuilder()
      .setName('ticket-panel').setDescription('Post the ticket panel so members can open tickets')
      .addChannelOption((o) => o.setName('channel').setDescription('Where to post the panel (defaults to here)').addChannelTypes(ChannelType.GuildText))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
      const g = db.getGuild(interaction.guild.id);
      if (!g.tickets.enabled || !g.tickets.categoryId)
        return interaction.reply({ embeds: [embeds.error(interaction.client, 'Set up tickets first', 'Run `/setup tickets` to choose a category and support role before posting a panel.')], ephemeral: true });
      const channel = interaction.options.getChannel('channel') || interaction.channel;
      const panel = tickets.buildPanel(interaction.client);
      try { await channel.send(panel); }
      catch (err) { return interaction.reply({ embeds: [embeds.error(interaction.client, 'Could not post', err.message)], ephemeral: true }); }
      if (!g.tickets.panelChannelId) { g.tickets.panelChannelId = channel.id; db.save(); }
      return interaction.reply({ embeds: [embeds.success(interaction.client, 'Panel posted', `The ticket panel is live in ${channel}. ${emoji.ticket}`)], ephemeral: true });
    },
  },
  {
    category: CATEGORY,
    data: new SlashCommandBuilder()
      .setName('ticket').setDescription('Manage the current ticket')
      .addSubcommand((s) => s.setName('close').setDescription('Close this ticket').addStringOption((o) => o.setName('reason').setDescription('Reason for closing')))
      .addSubcommand((s) => s.setName('add').setDescription('Add a user to this ticket').addUserOption((o) => o.setName('user').setDescription('User to add').setRequired(true)))
      .addSubcommand((s) => s.setName('remove').setDescription('Remove a user from this ticket').addUserOption((o) => o.setName('user').setDescription('User to remove').setRequired(true)))
      .addSubcommand((s) => s.setName('rename').setDescription('Rename this ticket channel').addStringOption((o) => o.setName('name').setDescription('New name').setRequired(true))),
    async execute(interaction) {
      const g = db.getGuild(interaction.guild.id);
      const t = g.tickets.open[interaction.channel.id];
      if (!t) return interaction.reply({ embeds: [embeds.error(interaction.client, 'Not a ticket', 'This command only works inside a ticket channel.')], ephemeral: true });
      const sub = interaction.options.getSubcommand();

      if (sub === 'close') return tickets.closeTicket(interaction, interaction.options.getString('reason'));

      if (!tickets.isStaff(interaction.member, g.tickets) && interaction.user.id !== t.ownerId)
        return interaction.reply({ embeds: [embeds.error(interaction.client, 'No permission', 'Only staff or the ticket owner can do that.')], ephemeral: true });

      if (sub === 'add') {
        const user = interaction.options.getUser('user');
        await interaction.channel.permissionOverwrites.edit(user.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true }).catch(() => {});
        return interaction.reply({ embeds: [embeds.success(interaction.client, 'User added', `${user} can now see this ticket.`)] });
      }
      if (sub === 'remove') {
        const user = interaction.options.getUser('user');
        await interaction.channel.permissionOverwrites.edit(user.id, { ViewChannel: false }).catch(() => {});
        return interaction.reply({ embeds: [embeds.success(interaction.client, 'User removed', `${user} can no longer see this ticket.`)] });
      }
      if (sub === 'rename') {
        const name = interaction.options.getString('name').slice(0, 90);
        await interaction.channel.setName(name).catch(() => {});
        return interaction.reply({ embeds: [embeds.success(interaction.client, 'Renamed', `Channel renamed to **${name}**.`)] });
      }
    },
  },
];
