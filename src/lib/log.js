'use strict';

const db = require('./db');

/** Send an embed to the guild's configured mod-log channel (if any). */
async function modLog(guild, embed) {
  try {
    const g = db.getGuild(guild.id);
    if (!g.modlog.channelId) return;
    const ch = await guild.channels.fetch(g.modlog.channelId).catch(() => null);
    if (ch && ch.isTextBased()) await ch.send({ embeds: [embed] }).catch(() => {});
  } catch {
    /* ignore */
  }
}

/** Try to DM a user; returns true if delivered. */
async function tryDM(user, payload) {
  try {
    await user.send(payload);
    return true;
  } catch {
    return false;
  }
}

module.exports = { modLog, tryDM };
