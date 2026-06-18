'use strict';

const { EmbedBuilder } = require('discord.js');
const { colors, emoji } = require('./theme');
const config = require('../../config');

function brandIcon(client) {
  return config.brand.icon || (client && client.user ? client.user.displayAvatarURL() : null);
}

/** Base themed embed with branded footer + timestamp. */
function base(client) {
  const e = new EmbedBuilder()
    .setColor(colors.brand)
    .setTimestamp()
    .setFooter({
      text: `${config.brand.name} ${emoji.dot} ${config.brand.tagline}`,
      iconURL: brandIcon(client) || undefined,
    });
  return e;
}

function tinted(client, color, title, description) {
  const e = base(client).setColor(color);
  if (title) e.setTitle(title);
  if (description) e.setDescription(description);
  return e;
}

module.exports = {
  base,
  brandIcon,
  success: (client, title, desc) => tinted(client, colors.success, `${emoji.success} ${title}`, desc),
  error: (client, title, desc) => tinted(client, colors.danger, `${emoji.error} ${title}`, desc),
  warn: (client, title, desc) => tinted(client, colors.warning, `${emoji.warn} ${title}`, desc),
  info: (client, title, desc) => tinted(client, colors.info, `${emoji.info} ${title}`, desc),
  brand: (client, title, desc) => tinted(client, colors.brand, title, desc),
  custom: tinted,
};
