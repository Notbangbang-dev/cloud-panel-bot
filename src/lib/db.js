'use strict';

/** Tiny atomic JSON store for per-guild settings, tickets and warnings. */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('../../config');

let state = null;
let queued = false;

function defaults() {
  return { guilds: {}, meta: { createdAt: new Date().toISOString() } };
}

function load() {
  if (state) return state;
  fs.mkdirSync(path.dirname(config.dataFile), { recursive: true });
  if (fs.existsSync(config.dataFile)) {
    try {
      state = JSON.parse(fs.readFileSync(config.dataFile, 'utf8'));
    } catch {
      state = defaults();
    }
  } else {
    state = defaults();
  }
  if (!state.guilds) state.guilds = {};
  return state;
}

function persist() {
  if (queued) return;
  queued = true;
  setImmediate(() => {
    queued = false;
    try {
      const tmp = `${config.dataFile}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
      fs.renameSync(tmp, config.dataFile);
    } catch (err) {
      console.error('[db] persist failed:', err.message);
    }
  });
}

function guildDefaults() {
  return {
    welcome: { enabled: false, channelId: null, message: 'Welcome {user} to **{server}**! You are member **#{count}**. {emoji}', dm: false, color: null },
    leave: { enabled: false, channelId: null, message: '**{tag}** has left {server}. We are now **{count}** members.' },
    autorole: { roleIds: [] },
    tickets: {
      enabled: false,
      categoryId: null,
      supportRoleId: null,
      panelChannelId: null,
      logChannelId: null,
      counter: 0,
      open: {}, // channelId -> { ownerId, type, claimedBy, number, createdAt }
    },
    modlog: { channelId: null },
    warnings: {}, // userId -> [ { id, modId, reason, at } ]
  };
}

function getGuild(guildId) {
  const s = load();
  if (!s.guilds[guildId]) {
    s.guilds[guildId] = guildDefaults();
    persist();
  }
  // Backfill any newly-added default keys.
  const def = guildDefaults();
  const g = s.guilds[guildId];
  for (const k of Object.keys(def)) {
    if (g[k] === undefined) g[k] = def[k];
    else if (def[k] && typeof def[k] === 'object' && !Array.isArray(def[k])) {
      for (const kk of Object.keys(def[k])) if (g[k][kk] === undefined) g[k][kk] = def[k][kk];
    }
  }
  return g;
}

function save() {
  persist();
}

// ---- Warnings helpers -----------------------------------------------------
function addWarning(guildId, userId, modId, reason) {
  const g = getGuild(guildId);
  if (!g.warnings[userId]) g.warnings[userId] = [];
  const entry = { id: crypto.randomBytes(4).toString('hex'), modId, reason, at: new Date().toISOString() };
  g.warnings[userId].push(entry);
  persist();
  return entry;
}
function getWarnings(guildId, userId) {
  return getGuild(guildId).warnings[userId] || [];
}
function clearWarnings(guildId, userId) {
  const g = getGuild(guildId);
  const n = (g.warnings[userId] || []).length;
  delete g.warnings[userId];
  persist();
  return n;
}
function removeWarning(guildId, userId, warnId) {
  const g = getGuild(guildId);
  const arr = g.warnings[userId] || [];
  const idx = arr.findIndex((w) => w.id === warnId);
  if (idx === -1) return false;
  arr.splice(idx, 1);
  if (!arr.length) delete g.warnings[userId];
  persist();
  return true;
}

module.exports = {
  load,
  getGuild,
  save,
  addWarning,
  getWarnings,
  clearWarnings,
  removeWarning,
};
