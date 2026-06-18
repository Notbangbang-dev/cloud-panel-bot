'use strict';

/** Parse human durations like "10m", "1h30m", "2d", "45s", "1w" into ms. */

const UNITS = { s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000 };

function parseDuration(input) {
  if (!input) return null;
  const str = String(input).trim().toLowerCase();
  if (/^\d+$/.test(str)) return Number(str) * 60000; // bare number = minutes
  const re = /(\d+)\s*(w|d|h|m|s)/g;
  let total = 0;
  let matched = false;
  let m;
  while ((m = re.exec(str))) {
    matched = true;
    total += Number(m[1]) * UNITS[m[2]];
  }
  return matched ? total : null;
}

function formatDuration(ms) {
  ms = Math.max(0, Math.floor(ms));
  if (ms < 1000) return '0s';
  let s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400); s -= d * 86400;
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60); s -= m * 60;
  return [d && `${d}d`, h && `${h}h`, m && `${m}m`, s && `${s}s`].filter(Boolean).join(' ') || '0s';
}

module.exports = { parseDuration, formatDuration };
