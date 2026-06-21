'use strict';

const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../lib/embeds');
const { colors, emoji, divider } = require('../lib/theme');
const config = require('../../config');

const CATEGORY = 'Information';

// Keep in sync with the Cloud Panel CHANGELOG.
const RELEASE = {
  version: '2.0.0',
  title: 'Cloud Panel v2 — “Ascension”',
  highlights: [
    { name: `${emoji.gear} Daily rewards`, value: 'Claim coins once a day with a streak bonus.' },
    { name: `${emoji.rocket} Achievements & XP`, value: 'Levels + badges (Backup Hoarder, Crash Survivor, Night Owl…). Admins add custom ones.' },
    { name: `${emoji.online} Server pets`, value: 'A coin-bought Tamagotchi that reacts to your servers’ health.' },
    { name: `${emoji.users} Themes & avatars`, value: 'Pick your own palette + upload a profile picture. Seasonal auto-themes too.' },
    { name: `${emoji.disk} Self-service resources`, value: "Edit your server's RAM/CPU/disk/databases from your quota." },
    { name: `${emoji.cpu} Panel analytics`, value: 'Signups, totals, coins in circulation & top balances (admin).' },
    { name: `${emoji.lock} View as user`, value: 'Admins open the panel exactly as any member sees it.' },
    { name: `${emoji.clock} Maintenance & banner`, value: 'Lock non-admins out, or show a site-wide announcement.' },
  ],
};

module.exports = [
  {
    category: CATEGORY,
    data: new SlashCommandBuilder()
      .setName('changelog')
      .setDescription(`Show what's new in ${config.brand.name}`),
    async execute(interaction) {
      const e = embeds
        .custom(interaction.client, colors.brand, `${emoji.cloud} ${config.brand.name} v${RELEASE.version}`, `**${RELEASE.title}**\n${divider}`)
        .addFields(RELEASE.highlights)
        .setFooter({ text: `${config.brand.name} ${emoji.dot} Deploy. Scale. Dominate.` });
      await interaction.reply({ embeds: [e] });
    },
  },
];
