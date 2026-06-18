'use strict';

const {
  SlashCommandBuilder, PermissionFlagsBits, ChannelType,
  ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder,
} = require('discord.js');
const embeds = require('../lib/embeds');
const { colors, emoji } = require('../lib/theme');
const config = require('../../config');

const CATEGORY = 'Information';

module.exports = [
  {
    category: CATEGORY,
    data: new SlashCommandBuilder()
      .setName('say').setDescription('Make the bot say something')
      .addStringOption((o) => o.setName('message').setDescription('What to say').setRequired(true))
      .addChannelOption((o) => o.setName('channel').setDescription('Channel (defaults to here)').addChannelTypes(ChannelType.GuildText))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    async execute(interaction) {
      const message = interaction.options.getString('message');
      const channel = interaction.options.getChannel('channel') || interaction.channel;
      try { await channel.send({ content: message.slice(0, 2000), allowedMentions: { parse: [] } }); }
      catch (err) { return interaction.reply({ embeds: [embeds.error(interaction.client, 'Failed', err.message)], ephemeral: true }); }
      return interaction.reply({ embeds: [embeds.success(interaction.client, 'Sent', `Message posted in ${channel}.`)], ephemeral: true });
    },
  },
  {
    category: CATEGORY,
    data: new SlashCommandBuilder()
      .setName('announce').setDescription('Post a themed announcement embed')
      .addStringOption((o) => o.setName('title').setDescription('Announcement title').setRequired(true))
      .addStringOption((o) => o.setName('message').setDescription('Announcement body (use \\n for new lines)').setRequired(true))
      .addChannelOption((o) => o.setName('channel').setDescription('Channel (defaults to here)').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
      .addRoleOption((o) => o.setName('ping').setDescription('Role to ping'))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
      const title = interaction.options.getString('title');
      const body = interaction.options.getString('message').replace(/\\n/g, '\n');
      const channel = interaction.options.getChannel('channel') || interaction.channel;
      const ping = interaction.options.getRole('ping');
      const e = embeds.custom(interaction.client, colors.brand, `${emoji.bell} ${title}`, body)
        .setThumbnail(embeds.brandIcon(interaction.client) || null)
        .setFooter({ text: `${config.brand.name} ${emoji.dot} announced by ${interaction.user.tag}` });
      try {
        await channel.send({ content: ping ? `${ping}` : undefined, embeds: [e], allowedMentions: ping ? { roles: [ping.id] } : { parse: [] } });
      } catch (err) { return interaction.reply({ embeds: [embeds.error(interaction.client, 'Failed', err.message)], ephemeral: true }); }
      return interaction.reply({ embeds: [embeds.success(interaction.client, 'Announced', `Posted in ${channel}.`)], ephemeral: true });
    },
  },
  {
    category: CATEGORY,
    data: new SlashCommandBuilder()
      .setName('embed').setDescription('Build & post a custom embed via a form')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    async execute(interaction) {
      const modal = new ModalBuilder().setCustomId('embed_modal').setTitle('Create an Embed');
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('title').setLabel('Title').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(256)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('description').setLabel('Description').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(4000)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('color').setLabel('Hex color (optional, e.g. #6366f1)').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(7)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('image').setLabel('Image URL (optional)').setStyle(TextInputStyle.Short).setRequired(false))
      );
      await interaction.showModal(modal);
    },
  },
];
