'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../lib/embeds');
const { colors, emoji, statusEmoji, divider } = require('../lib/theme');
const db = require('../lib/db');
const config = require('../../config');

const CATEGORY = 'Cloud Panel';

function fmtBytes(n) {
  n = Number(n) || 0;
  if (n < 1024) return n + ' B';
  const u = ['KB', 'MB', 'GB', 'TB']; let i = -1;
  do { n /= 1024; i++; } while (n >= 1024 && i < u.length - 1);
  return n.toFixed(n >= 10 || i === 0 ? 0 : 1) + ' ' + u[i];
}
function fmtUptime(ms) {
  let s = Math.floor((ms || 0) / 1000); if (s <= 0) return 'offline';
  const d = Math.floor(s / 86400); s -= d * 86400; const h = Math.floor(s / 3600); s -= h * 3600; const m = Math.floor(s / 60);
  return [d && d + 'd', h && h + 'h', m && m + 'm'].filter(Boolean).join(' ') || '<1m';
}
function allowed(interaction) {
  const g = db.getGuild(interaction.guild.id);
  if (interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) return true;
  return g.cloudpanel.adminRoleId ? interaction.member.roles.cache.has(g.cloudpanel.adminRoleId) : false;
}

module.exports = [
  {
    category: CATEGORY,
    data: new SlashCommandBuilder()
      .setName('server').setDescription('Control your Cloud Panel game servers')
      .addSubcommand((s) => s.setName('list').setDescription('List all Cloud Panel servers'))
      .addSubcommand((s) => s.setName('status').setDescription('Show live status of a server')
        .addStringOption((o) => o.setName('name').setDescription('Server name').setRequired(true)))
      .addSubcommand((s) => s.setName('power').setDescription('Start / stop / restart / kill a server')
        .addStringOption((o) => o.setName('name').setDescription('Server name').setRequired(true))
        .addStringOption((o) => o.setName('action').setDescription('Power action').setRequired(true)
          .addChoices({ name: 'start', value: 'start' }, { name: 'stop', value: 'stop' }, { name: 'restart', value: 'restart' }, { name: 'kill', value: 'kill' })))
      .addSubcommand((s) => s.setName('send').setDescription('Send a console command to a server')
        .addStringOption((o) => o.setName('name').setDescription('Server name').setRequired(true))
        .addStringOption((o) => o.setName('command').setDescription('Console command to run').setRequired(true))),
    async execute(interaction, ctx) {
      const client = interaction.client;
      if (!config.cloudPanel.enabled || !ctx.panel)
        return interaction.reply({ embeds: [embeds.error(client, 'Cloud Panel not connected', 'Set `CLOUDPANEL_URL` and credentials in the bot\'s `.env`, then restart the bot.')], ephemeral: true });
      if (!allowed(interaction))
        return interaction.reply({ embeds: [embeds.error(client, 'Not allowed', 'You need the configured Cloud Panel role (or Manage Server). Set it with `/setup cloudpanel`.')], ephemeral: true });

      const sub = interaction.options.getSubcommand();
      await interaction.deferReply({ ephemeral: sub !== 'power' });

      try {
        if (sub === 'list') {
          const servers = await ctx.panel.listServers();
          if (!servers.length) return interaction.editReply({ embeds: [embeds.info(client, 'No servers', 'There are no servers on the panel yet.')] });
          const e = embeds.custom(client, colors.brand, `${emoji.cloud} Cloud Panel Servers`, `${servers.length} server(s) ${emoji.dot} live status\n${divider}`)
            .setThumbnail(embeds.brandIcon(client) || null);
          for (const s of servers.slice(0, 20)) {
            const r = s.resources || {};
            e.addFields({
              name: `${statusEmoji[s.status] || emoji.offline} ${s.name}`,
              value: `${emoji.net} \`${s.allocation ? s.allocation.notation : 'n/a'}\` ${emoji.dot} ${emoji.cpu} ${(r.cpu || 0).toFixed(0)}% ${emoji.dot} ${emoji.ram} ${fmtBytes(r.memory || 0)} ${emoji.dot} ${emoji.disk} ${fmtBytes(r.disk || 0)}`,
            });
          }
          return interaction.editReply({ embeds: [e] });
        }

        const query = interaction.options.getString('name');
        const server = await ctx.panel.findServer(query);
        if (!server) return interaction.editReply({ embeds: [embeds.error(client, 'Server not found', `No server matching \`${query}\`. Try \`/server list\`.`)] });

        if (sub === 'status') {
          const detail = await ctx.panel.getServer(server.id).catch(() => server);
          const r = (await ctx.panel.resources(server.id).catch(() => null)) || { status: server.status, stats: server.resources || {} };
          const st = r.stats || {};
          const e = embeds.custom(client, colors.brand, `${statusEmoji[r.status] || emoji.offline} ${server.name}`)
            .setThumbnail(embeds.brandIcon(client) || null)
            .addFields(
              { name: `${emoji.bolt} Status`, value: `\`${r.status}\``, inline: true },
              { name: `${emoji.net} Address`, value: `\`${server.allocation ? server.allocation.notation : 'n/a'}\``, inline: true },
              { name: `${emoji.clock} Uptime`, value: fmtUptime(st.uptime), inline: true },
              { name: `${emoji.cpu} CPU`, value: `${(st.cpu || 0).toFixed(1)}% / ${detail.limits ? detail.limits.cpu : '?'}%`, inline: true },
              { name: `${emoji.ram} Memory`, value: `${fmtBytes(st.memory || 0)} / ${detail.limits ? detail.limits.memory + ' MB' : '?'}`, inline: true },
              { name: `${emoji.disk} Disk`, value: `${fmtBytes(st.disk || 0)} / ${detail.limits ? detail.limits.disk + ' MB' : '?'}`, inline: true },
              { name: `${emoji.panel} Egg`, value: server.egg ? server.egg.name : '—', inline: true },
              { name: `${emoji.gear} Node`, value: server.node ? server.node.name : '—', inline: true }
            ).setDescription(divider);
          return interaction.editReply({ embeds: [e] });
        }

        if (sub === 'power') {
          const action = interaction.options.getString('action');
          await ctx.panel.power(server.id, action);
          const e = embeds.custom(client, colors.success, `${emoji.power} Power: ${action}`, `Sent **${action}** to **${server.name}**. ${emoji.success}`)
            .setFooter({ text: `Requested by ${interaction.user.tag}` });
          return interaction.editReply({ embeds: [e] });
        }

        if (sub === 'send') {
          const command = interaction.options.getString('command');
          await ctx.panel.command(server.id, command);
          return interaction.editReply({ embeds: [embeds.success(client, 'Command sent', `\`${command}\` ${emoji.arrow} **${server.name}**`)] });
        }
      } catch (err) {
        return interaction.editReply({ embeds: [embeds.error(client, 'Cloud Panel error', err.message)] });
      }
    },
  },
];
