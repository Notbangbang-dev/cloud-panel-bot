'use strict';

/** Loads .env (no dependency) and exposes typed config. */

const fs = require('fs');
const path = require('path');

(function loadEnv() {
  const envPath = process.env.BOT_ENV_FILE || path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  try {
    for (const raw of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
        val = val.slice(1, -1);
      if (process.env[key] === undefined) process.env[key] = val;
    }
  } catch {
    /* ignore */
  }
})();

module.exports = {
  token: process.env.DISCORD_TOKEN || '',
  clientId: process.env.CLIENT_ID || '',
  guildId: process.env.GUILD_ID || '',

  cloudPanel: {
    url: (process.env.CLOUDPANEL_URL || '').replace(/\/+$/, ''),
    token: process.env.CLOUDPANEL_TOKEN || '',
    email: process.env.CLOUDPANEL_EMAIL || '',
    password: process.env.CLOUDPANEL_PASSWORD || '',
    get enabled() {
      return Boolean(this.url && (this.token || (this.email && this.password)));
    },
  },

  brand: {
    name: process.env.BOT_BRAND_NAME || 'Cloud Panel',
    tagline: process.env.BOT_BRAND_TAGLINE || 'Deploy. Scale. Dominate.',
    icon: process.env.BOT_BRAND_ICON || '',
  },

  dataFile: path.join(__dirname, 'data', 'store.json'),
};
