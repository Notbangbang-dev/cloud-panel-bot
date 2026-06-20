'use strict';

const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../lib/embeds');
const { colors, emoji, divider } = require('../lib/theme');
const config = require('../../config');

const CATEGORY = 'Information';

// Keep in sync with the Cloud Panel CHANGELOG.
const RELEASE = {
  version: '1.9.0',
  title: 'The biggest feature drop yet',
  highlights: [
    { name: `${emoji.users} Subusers & teams`, value: 'Share a server with granular permissions (console, files, power, backups, databases…).' },
    { name: `${emoji.clock} Scheduled tasks`, value: 'Cron-style restarts, nightly backups & timed commands.' },
    { name: `${emoji.lock} Two-factor auth`, value: 'Authenticator-app 2FA with QR enrollment & recovery codes.' },
    { name: `${emoji.disk} Per-server databases`, value: 'Provision real MySQL/MariaDB databases per server.' },
    { name: `${emoji.gear} Modrinth browser`, value: 'Search & one-click install plugins/mods, plus one-click modpacks.' },
    { name: `${emoji.online} Live player list`, value: "See who's online and kick/ban in a click." },
    { name: `${emoji.rocket} 8 new eggs`, value: 'Quilt, Pufferfish, Leaf, PocketMine + SteamCMD (Rust, Valheim, CS2).' },
    { name: `${emoji.cpu} Metrics & status pages`, value: 'Historical CPU/RAM graphs + a public status page per server.' },
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
