'use strict';

/** Cloud Panel visual theme — colors + emoji used across all embeds. */

const colors = {
  brand: 0x6366f1, // indigo
  cyan: 0x22d3ee,
  violet: 0xa855f7,
  pink: 0xec4899,
  success: 0x34d399,
  danger: 0xf87171,
  warning: 0xfbbf24,
  info: 0x38bdf8,
  dark: 0x0b0f1a,
  muted: 0x8a97b4,
};

// Unicode emoji so no server-side emoji upload is required.
const emoji = {
  cloud: '☁️',
  rocket: '🚀',
  spark: '✨',
  bolt: '⚡',
  shield: '🛡️',
  gear: '⚙️',
  wrench: '🔧',
  ticket: '🎫',
  lock: '🔒',
  unlock: '🔓',
  hammer: '🔨',
  boot: '👢',
  mute: '🔇',
  unmute: '🔊',
  snail: '🐌',
  broom: '🧹',
  warn: '⚠️',
  success: '✅',
  error: '❌',
  info: 'ℹ️',
  loading: '⏳',
  online: '🟢',
  offline: '⚫',
  starting: '🟡',
  crashed: '🔴',
  installing: '🔵',
  cpu: '🧠',
  ram: '💾',
  disk: '🗄️',
  net: '🌐',
  clock: '⏱️',
  user: '👤',
  users: '👥',
  crown: '👑',
  star: '⭐',
  wave: '👋',
  door: '🚪',
  pin: '📌',
  bell: '🔔',
  fire: '🔥',
  gem: '💎',
  arrow: '➜',
  dot: '•',
  panel: '🖥️',
  play: '▶️',
  stop: '⏹️',
  restart: '🔁',
  power: '⏻',
};

const statusEmoji = {
  running: emoji.online,
  offline: emoji.offline,
  starting: emoji.starting,
  stopping: emoji.starting,
  crashed: emoji.crashed,
  installing: emoji.installing,
  suspended: '🟣',
};

// A thin gradient-ish divider line for that "insane" look.
const divider = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

module.exports = { colors, emoji, statusEmoji, divider };
