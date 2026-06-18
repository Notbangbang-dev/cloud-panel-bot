'use strict';

/** Registers slash commands with Discord (guild = instant, global = ~1h). */

const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
const config = require('../config');

if (!config.token || !config.clientId) {
  console.error('[deploy] DISCORD_TOKEN and CLIENT_ID are required in .env');
  process.exit(1);
}

const body = [];
const dir = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.js'))) {
  const mod = require(path.join(dir, file));
  const list = Array.isArray(mod) ? mod : mod.commands ? mod.commands : [mod];
  for (const cmd of list) if (cmd && cmd.data) body.push(cmd.data.toJSON());
}

const rest = new REST().setToken(config.token);

(async () => {
  try {
    console.log(`[deploy] registering ${body.length} commands…`);
    if (config.guildId) {
      await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body });
      console.log(`[deploy] ✓ registered to guild ${config.guildId} (instant).`);
    } else {
      await rest.put(Routes.applicationCommands(config.clientId), { body });
      console.log('[deploy] ✓ registered globally (may take up to 1 hour to appear).');
    }
  } catch (err) {
    console.error('[deploy] failed:', err);
    process.exit(1);
  }
})();
