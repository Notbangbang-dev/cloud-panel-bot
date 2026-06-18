'use strict';

const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder, EmbedBuilder,
} = require('discord.js');
const db = require('./db');
const embeds = require('./embeds');
const { colors, emoji, divider } = require('./theme');
const config = require('../../config');

const TICKET_TYPES = {
  general: { label: 'General Support', emoji: '💬', desc: 'Questions and general help' },
  server: { label: 'Server Help', emoji: '🖥️', desc: 'Game server issues & setup' },
  report: { label: 'Report a User', emoji: '🚩', desc: 'Report someone breaking the rules' },
};

function buildPanel(client) {
  const e = embeds.base(client)
    .setColor(colors.brand)
    .setTitle(`${emoji.ticket} ${config.brand.name} Support`)
    .setDescription(
      `Need a hand? Open a private ticket with our team.\n` +
      `Select the category below that best fits your request and a channel will be created just for you.\n\n` +
      Object.values(TICKET_TYPES).map((t) => `${t.emoji} **${t.label}** ${emoji.dot} ${t.desc}`).join('\n') +
      `\n\n${divider}`
    )
    .setThumbnail(embeds.brandIcon(client) || null)
    .addFields({ name: `${emoji.bolt} Response time`, value: 'Our staff are usually quick — please be patient and provide as much detail as you can.' });

  const menu = new StringSelectMenuBuilder()
    .setCustomId('ticket_open')
    .setPlaceholder('🎫  Select a category to open a ticket…')
    .addOptions(
      Object.entries(TICKET_TYPES).map(([key, t]) =>
        new StringSelectMenuOptionBuilder().setLabel(t.label).setValue(key).setDescription(t.desc).setEmoji(t.emoji)
      )
    );
  return { embeds: [e], components: [new ActionRowBuilder().addComponents(menu)] };
}

function ticketControls() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ticket_claim').setLabel('Claim').setEmoji('🙋').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('ticket_transcript').setLabel('Transcript').setEmoji('📄').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('ticket_close').setLabel('Close').setEmoji('🔒').setStyle(ButtonStyle.Danger)
    ),
  ];
}

function isStaff(member, cfg) {
  if (!member) return false;
  if (member.permissions.has(PermissionFlagsBits.ManageGuild)) return true;
  return cfg.supportRoleId ? member.roles.cache.has(cfg.supportRoleId) : false;
}

async function createTicket(interaction, typeKey) {
  const { guild, user, client } = interaction;
  const g = db.getGuild(guild.id);
  const cfg = g.tickets;
  const type = TICKET_TYPES[typeKey] || TICKET_TYPES.general;

  if (!cfg.enabled || !cfg.categoryId) {
    return interaction.reply({ embeds: [embeds.error(client, 'Tickets not configured', 'An administrator needs to run `/setup tickets` first.')], ephemeral: true });
  }

  const existing = Object.entries(cfg.open).find(([, t]) => t.ownerId === user.id);
  if (existing && guild.channels.cache.has(existing[0])) {
    return interaction.reply({ embeds: [embeds.warn(client, 'You already have a ticket', `Please use <#${existing[0]}> before opening another one.`)], ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  const number = (cfg.counter || 0) + 1;
  cfg.counter = number;

  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: user.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks],
    },
    {
      id: client.user.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.AttachFiles],
    },
  ];
  if (cfg.supportRoleId) {
    overwrites.push({
      id: cfg.supportRoleId,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks],
    });
  }

  let channel;
  try {
    channel = await guild.channels.create({
      name: `ticket-${String(number).padStart(4, '0')}`,
      type: ChannelType.GuildText,
      parent: cfg.categoryId,
      topic: `${type.label} • opened by ${user.tag} (${user.id})`,
      permissionOverwrites: overwrites,
    });
  } catch (err) {
    return interaction.editReply({ embeds: [embeds.error(client, 'Could not create ticket', `I may be missing permissions or the configured category is invalid.\n\`${err.message}\``)] });
  }

  cfg.open[channel.id] = { ownerId: user.id, type: typeKey, number, claimedBy: null, createdAt: new Date().toISOString() };
  db.save();

  const welcome = embeds.base(client)
    .setColor(colors.brand)
    .setAuthor({ name: `Ticket #${String(number).padStart(4, '0')} ${emoji.dot} ${type.label}`, iconURL: user.displayAvatarURL() })
    .setDescription(
      `${emoji.wave} Hey ${user}, thanks for reaching out!\n\n` +
      `Please describe your issue in as much detail as possible and our team will be with you shortly.\n\n` +
      `${type.emoji} **Category:** ${type.label}\n${emoji.clock} **Opened:** <t:${Math.floor(Date.now() / 1000)}:R>\n\n${divider}`
    )
    .setFooter({ text: `${config.brand.name} Support ${emoji.dot} use the buttons below to manage this ticket` });

  const pings = [`<@${user.id}>`, cfg.supportRoleId ? `<@&${cfg.supportRoleId}>` : ''].filter(Boolean).join(' ');
  await channel.send({ content: pings, embeds: [welcome], components: ticketControls() });

  await interaction.editReply({ embeds: [embeds.success(client, 'Ticket created', `Your ticket is ready: <#${channel.id}>`)] });
  await logTicket(guild, client, embeds.custom(client, colors.success, `${emoji.ticket} Ticket Opened`,
    `**#${String(number).padStart(4, '0')}** ${emoji.dot} ${type.label}\n${emoji.user} ${user} (${user.tag})\n${emoji.arrow} <#${channel.id}>`));
}

async function claimTicket(interaction) {
  const { guild, member, client, channel } = interaction;
  const g = db.getGuild(guild.id);
  const t = g.tickets.open[channel.id];
  if (!t) return interaction.reply({ embeds: [embeds.error(client, 'Not a ticket', 'This channel is not an open ticket.')], ephemeral: true });
  if (!isStaff(member, g.tickets)) return interaction.reply({ embeds: [embeds.error(client, 'Staff only', 'Only support staff can claim tickets.')], ephemeral: true });
  if (t.claimedBy) return interaction.reply({ embeds: [embeds.warn(client, 'Already claimed', `This ticket is handled by <@${t.claimedBy}>.`)], ephemeral: true });

  t.claimedBy = member.id;
  db.save();
  await interaction.reply({ embeds: [embeds.success(client, 'Ticket claimed', `${member} will be assisting with this ticket.`)] });
  await channel.setName(`claimed-${String(t.number).padStart(4, '0')}`).catch(() => {});
}

async function transcriptTicket(interaction, { silent = false } = {}) {
  const { guild, channel, client, member } = interaction;
  const g = db.getGuild(guild.id);
  const t = g.tickets.open[channel.id];
  if (!t) return interaction.reply({ embeds: [embeds.error(client, 'Not a ticket', 'This channel is not an open ticket.')], ephemeral: true });
  if (!silent) await interaction.deferReply({ ephemeral: true });

  const file = await buildTranscript(channel, t);
  const target = await guild.channels.fetch(g.tickets.logChannelId).catch(() => null);
  if (target && target.isTextBased()) {
    await target.send({
      embeds: [embeds.custom(client, colors.info, `${emoji.info} Transcript ${emoji.dot} #${String(t.number).padStart(4, '0')}`,
        `Saved by ${member} for ticket opened by <@${t.ownerId}>.`)],
      files: [file],
    }).catch(() => {});
  }
  if (!silent) await interaction.editReply({ embeds: [embeds.success(client, 'Transcript saved', target ? `Sent to <#${g.tickets.logChannelId}>.` : 'No log channel configured — attaching here.')], files: target ? [] : [file] });
  return file;
}

async function closeTicket(interaction, reason) {
  const { guild, channel, client, member } = interaction;
  const g = db.getGuild(guild.id);
  const t = g.tickets.open[channel.id];
  if (!t) return interaction.reply({ embeds: [embeds.error(client, 'Not a ticket', 'This channel is not an open ticket.')], ephemeral: true });

  const owner = t.ownerId;
  const isOwner = member.id === owner;
  if (!isOwner && !isStaff(member, g.tickets))
    return interaction.reply({ embeds: [embeds.error(client, 'No permission', 'Only the ticket owner or staff can close this ticket.')], ephemeral: true });

  await interaction.reply({ embeds: [embeds.warn(client, 'Closing ticket…', `This channel will be deleted in a few seconds.${reason ? `\n**Reason:** ${reason}` : ''}`)] });

  // Transcript to log + DM owner.
  const file = await buildTranscript(channel, t).catch(() => null);
  const logCh = g.tickets.logChannelId ? await guild.channels.fetch(g.tickets.logChannelId).catch(() => null) : null;
  const closeEmbed = embeds.custom(client, colors.danger, `${emoji.lock} Ticket Closed`,
    `**#${String(t.number).padStart(4, '0')}** ${emoji.dot} ${(TICKET_TYPES[t.type] || {}).label || 'Ticket'}\n` +
    `${emoji.user} Owner: <@${owner}>\n${emoji.shield} Closed by: ${member}\n${reason ? `${emoji.arrow} Reason: ${reason}` : ''}`);
  if (logCh && logCh.isTextBased()) await logCh.send({ embeds: [closeEmbed], files: file ? [file] : [] }).catch(() => {});

  const ownerUser = await client.users.fetch(owner).catch(() => null);
  if (ownerUser) {
    ownerUser.send({
      embeds: [embeds.custom(client, colors.brand, `${emoji.ticket} Your ticket was closed`,
        `Your ticket **#${String(t.number).padStart(4, '0')}** in **${guild.name}** has been closed.${reason ? `\n**Reason:** ${reason}` : ''}\nA transcript is attached for your records.`)],
      files: file ? [file] : [],
    }).catch(() => {});
  }

  delete g.tickets.open[channel.id];
  db.save();
  setTimeout(() => channel.delete().catch(() => {}), 5000);
}

async function buildTranscript(channel, t) {
  let messages = [];
  try {
    const fetched = await channel.messages.fetch({ limit: 100 });
    messages = [...fetched.values()].reverse();
  } catch { /* ignore */ }

  const esc = (s) => String(s || '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const rows = messages.map((m) => {
    const time = new Date(m.createdTimestamp).toLocaleString();
    const content = esc(m.content) || (m.embeds.length ? '<em>[embed]</em>' : (m.attachments.size ? '<em>[attachment]</em>' : ''));
    return `<div class="msg"><span class="meta">${esc(m.author.tag)} <span class="t">${time}</span></span><div class="c">${content}</div></div>`;
  }).join('\n');

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Ticket #${t.number} transcript</title>
<style>
:root{--bg:#0b0f1a;--card:#121828;--cyan:#22d3ee;--indigo:#6366f1;--text:#e7ecf6;--muted:#8a97b4}
body{margin:0;background:radial-gradient(60vw 60vw at 10% -10%,rgba(99,102,241,.25),transparent),#070a12;color:var(--text);font-family:Inter,Segoe UI,system-ui,sans-serif;padding:32px}
.h{display:flex;align-items:center;gap:14px;margin-bottom:20px}
.logo{width:46px;height:46px;border-radius:12px;background:linear-gradient(135deg,#22d3ee,#6366f1,#a855f7)}
h1{font-size:20px;margin:0}.sub{color:var(--muted);font-size:13px}
.wrap{max-width:820px;margin:auto}
.msg{background:var(--card);border:1px solid rgba(118,140,200,.14);border-radius:12px;padding:12px 14px;margin:10px 0}
.meta{font-weight:700;color:var(--cyan);font-size:13px}.t{color:var(--muted);font-weight:400;margin-left:8px;font-size:11px}
.c{margin-top:6px;white-space:pre-wrap;line-height:1.5;font-size:14px}
.f{color:var(--muted);font-size:12px;margin-top:18px;text-align:center}
</style></head><body><div class="wrap">
<div class="h"><div class="logo"></div><div><h1>Cloud Panel — Ticket #${String(t.number).padStart(4, '0')}</h1><div class="sub">${esc((TICKET_TYPES[t.type] || {}).label || 'Ticket')} • exported ${new Date().toLocaleString()}</div></div></div>
${rows || '<p class="sub">No messages.</p>'}
<div class="f">Cloud Panel • Deploy. Scale. Dominate.</div>
</div></body></html>`;

  return new AttachmentBuilder(Buffer.from(html, 'utf8'), { name: `transcript-${String(t.number).padStart(4, '0')}.html` });
}

async function logTicket(guild, client, embed) {
  const g = db.getGuild(guild.id);
  if (!g.tickets.logChannelId) return;
  const ch = await guild.channels.fetch(g.tickets.logChannelId).catch(() => null);
  if (ch && ch.isTextBased()) ch.send({ embeds: [embed] }).catch(() => {});
}

module.exports = {
  TICKET_TYPES,
  buildPanel,
  ticketControls,
  isStaff,
  createTicket,
  claimTicket,
  transcriptTicket,
  closeTicket,
};
