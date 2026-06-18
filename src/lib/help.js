'use strict';

const { ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const embeds = require('./embeds');
const { colors, emoji, divider } = require('./theme');
const config = require('../../config');

const META = {
  Moderation: { emoji: '🛡️', desc: 'Keep your community safe and tidy' },
  Tickets: { emoji: '🎫', desc: 'Private support ticket system' },
  Configuration: { emoji: '⚙️', desc: 'Set the bot up for your server' },
  'Cloud Panel': { emoji: '☁️', desc: 'Control your game servers live' },
  Information: { emoji: 'ℹ️', desc: 'Stats, lookups & utilities' },
};
const ORDER = ['Moderation', 'Tickets', 'Cloud Panel', 'Configuration', 'Information'];

function group(commands) {
  const map = {};
  for (const cmd of commands.values()) {
    const cat = cmd.category || 'Information';
    (map[cat] = map[cat] || []).push(cmd);
  }
  for (const k of Object.keys(map)) map[k].sort((a, b) => a.data.name.localeCompare(b.data.name));
  return map;
}

function buildHelp(client, commands, category = null) {
  const map = group(commands);
  const cats = ORDER.filter((c) => map[c]).concat(Object.keys(map).filter((c) => !ORDER.includes(c)));
  const total = commands.size;

  let e;
  if (!category || !map[category]) {
    e = embeds.custom(client, colors.brand, `${emoji.cloud} ${config.brand.name} Bot ${emoji.dot} Help`)
      .setThumbnail(embeds.brandIcon(client) || null)
      .setDescription(
        `*${config.brand.tagline}*\n\n` +
        `The all-in-one bot for your community: moderation, tickets, welcomes, autorole and **live Cloud Panel control**.\n` +
        `Use the menu below to explore **${total}** commands by category.\n${divider}`
      );
    for (const cat of cats) {
      const m = META[cat] || { emoji: emoji.spark, desc: '' };
      e.addFields({ name: `${m.emoji} ${cat} ${emoji.dot} ${map[cat].length}`, value: map[cat].map((c) => `\`/${c.data.name}\``).join(' ') });
    }
  } else {
    const m = META[category] || { emoji: emoji.spark, desc: '' };
    e = embeds.custom(client, colors.brand, `${m.emoji} ${category}`, `${m.desc}\n${divider}`)
      .setThumbnail(embeds.brandIcon(client) || null);
    for (const c of map[category]) {
      e.addFields({ name: `/${c.data.name}`, value: c.data.description || 'No description' });
    }
  }

  const menu = new StringSelectMenuBuilder()
    .setCustomId('help_menu')
    .setPlaceholder('📚  Browse a category…')
    .addOptions(
      new StringSelectMenuOptionBuilder().setLabel('Overview').setValue('overview').setEmoji('🏠').setDescription('Back to the main help page'),
      ...cats.map((cat) => {
        const m = META[cat] || { emoji: '✨', desc: '' };
        return new StringSelectMenuOptionBuilder().setLabel(cat).setValue(cat).setEmoji(m.emoji).setDescription((m.desc || '').slice(0, 90));
      })
    );

  return { embeds: [e], components: [new ActionRowBuilder().addComponents(menu)] };
}

module.exports = { buildHelp };
