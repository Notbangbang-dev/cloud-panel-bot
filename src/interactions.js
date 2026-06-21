'use strict';

const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const embeds = require('./lib/embeds');
const { colors, emoji } = require('./lib/theme');
const tickets = require('./lib/tickets');
const { buildHelp } = require('./lib/help');

async function safeReply(interaction, payload) {
  try {
    if (interaction.deferred || interaction.replied) return await interaction.followUp({ ...payload, ephemeral: true });
    return await interaction.reply({ ...payload, ephemeral: true });
  } catch {
    /* ignore */
  }
}

async function handleInteraction(interaction, ctx) {
  const client = interaction.client;

  // ---- Slash commands ----
  if (interaction.isChatInputCommand()) {
    if (!interaction.inGuild())
      return safeReply(interaction, { embeds: [embeds.error(client, 'Server only', 'These commands only work inside a server.')] });
    const cmd = client.commands.get(interaction.commandName);
    if (!cmd) return;
    // Defense-in-depth: re-check the command's required permissions server-side.
    // setDefaultMemberPermissions is only a DEFAULT that a guild admin can
    // override in Server Settings → Integrations, so we never rely on Discord
    // alone to gate privileged commands (ban/kick/purge/say/announce/…).
    try {
      const need = cmd.data && cmd.data.default_member_permissions;
      if (need && interaction.memberPermissions && !interaction.memberPermissions.has(BigInt(need))) {
        return safeReply(interaction, { embeds: [embeds.error(client, 'Missing permission', 'You do not have permission to use this command.')] });
      }
    } catch { /* if we can't evaluate perms, fall through to the command's own checks */ }
    try {
      await cmd.execute(interaction, ctx);
    } catch (err) {
      console.error(`[command:${interaction.commandName}]`, err);
      await safeReply(interaction, { embeds: [embeds.error(client, 'Something went wrong', `\`${err.message}\``)] });
    }
    return;
  }

  try {
    // ---- Buttons ----
    if (interaction.isButton()) {
      if (interaction.customId === 'ticket_claim') return tickets.claimTicket(interaction);
      if (interaction.customId === 'ticket_transcript') return tickets.transcriptTicket(interaction);
      if (interaction.customId === 'ticket_close') {
        const modal = new ModalBuilder().setCustomId('ticket_close_modal').setTitle('Close Ticket');
        modal.addComponents(new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('reason').setLabel('Reason (optional)').setStyle(TextInputStyle.Paragraph).setRequired(false).setMaxLength(500)
        ));
        return interaction.showModal(modal);
      }
      return;
    }

    // ---- Select menus ----
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'ticket_open') return tickets.createTicket(interaction, interaction.values[0]);
      if (interaction.customId === 'help_menu') {
        const v = interaction.values[0];
        return interaction.update(buildHelp(client, client.commands, v === 'overview' ? null : v));
      }
      return;
    }

    // ---- Modals ----
    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'ticket_close_modal')
        return tickets.closeTicket(interaction, interaction.fields.getTextInputValue('reason') || null);

      if (interaction.customId === 'embed_modal') {
        const title = interaction.fields.getTextInputValue('title');
        const description = interaction.fields.getTextInputValue('description').replace(/\\n/g, '\n');
        const colorRaw = (interaction.fields.getTextInputValue('color') || '').trim();
        const image = (interaction.fields.getTextInputValue('image') || '').trim();
        let color = colors.brand;
        if (/^#?[0-9a-fA-F]{6}$/.test(colorRaw)) color = parseInt(colorRaw.replace('#', ''), 16);
        const e = embeds.base(client).setColor(color).setTitle(title).setDescription(description);
        if (/^https?:\/\//.test(image)) e.setImage(image);
        try {
          await interaction.channel.send({ embeds: [e] });
          return safeReply(interaction, { embeds: [embeds.success(client, 'Embed posted', `${emoji.success} Your embed is live in ${interaction.channel}.`)] });
        } catch (err) {
          return safeReply(interaction, { embeds: [embeds.error(client, 'Failed', err.message)] });
        }
      }
      return;
    }
  } catch (err) {
    console.error('[interaction]', err);
    await safeReply(interaction, { embeds: [embeds.error(client, 'Something went wrong', `\`${err.message}\``)] });
  }
}

module.exports = { handleInteraction };
