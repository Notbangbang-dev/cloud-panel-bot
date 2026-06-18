'use strict';

/** Offline validation: loads every command + lib and builds command JSON.
 *  Catches syntax errors and invalid SlashCommandBuilder definitions without
 *  needing a Discord token. Run with: npm run check */

const fs = require('fs');
const path = require('path');

let errors = 0;
const commands = [];

const dir = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.js'))) {
  try {
    const mod = require(path.join(dir, file));
    const list = Array.isArray(mod) ? mod : mod.commands ? mod.commands : [mod];
    for (const cmd of list) {
      if (!cmd || !cmd.data || typeof cmd.execute !== 'function') {
        console.error(`✗ ${file}: invalid command export`);
        errors++;
        continue;
      }
      const json = cmd.data.toJSON(); // validates the builder
      commands.push({ name: json.name, category: cmd.category || 'Information', options: (json.options || []).length });
    }
  } catch (err) {
    console.error(`✗ ${file}: ${err.message}`);
    errors++;
  }
}

// Require core libs / entry modules to surface syntax errors.
for (const rel of ['lib/embeds.js', 'lib/db.js', 'lib/theme.js', 'lib/duration.js', 'lib/cloudpanel.js', 'lib/tickets.js', 'lib/help.js', 'lib/log.js', 'interactions.js']) {
  try { require(path.join(__dirname, rel)); }
  catch (err) { console.error(`✗ ${rel}: ${err.message}`); errors++; }
}

const byCat = commands.reduce((a, c) => { (a[c.category] = a[c.category] || []).push(c.name); return a; }, {});
console.log('\n=== Cloud Panel Bot — command check ===');
for (const [cat, list] of Object.entries(byCat)) console.log(`  ${cat} (${list.length}): ${list.map((n) => '/' + n).join(', ')}`);
console.log(`\nTotal commands: ${commands.length}`);
console.log(errors ? `\n❌ ${errors} error(s) found.` : '\n✅ All command definitions are valid.');
process.exit(errors ? 1 : 0);
