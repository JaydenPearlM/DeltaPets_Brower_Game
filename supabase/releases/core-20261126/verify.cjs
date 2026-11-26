'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const lane = process.argv[2];
assert(['fresh', 'existing'].includes(lane), 'Usage: node verify.cjs fresh|existing');
const dir = path.join(__dirname, lane);
const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'checksums.json')));
const sha = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const folder = path.join(dir, 'supabase/migrations');
assert.deepEqual(fs.readdirSync(folder).sort(), manifest.migrations.map(m => m.file).sort(), 'Unapproved/missing migration');
assert.equal(sha(path.join(dir, 'supabase/config.toml')), manifest.configSha256, 'Config changed');
for (const m of manifest.migrations) assert.equal(sha(path.join(folder, m.file)), m.sha256, 'Changed migration: ' + m.file);
if (lane === 'existing') {
  const originals = path.resolve(__dirname, '../../migrations');
  for (const m of manifest.migrations.filter(m => manifest.expectedPredecessorVersions.includes(m.file.slice(0, 14)))) {
    assert.equal(sha(path.join(originals, m.file)), m.sha256, 'Historical source changed: ' + m.file);
  }
}
console.log(`PASS: ${lane}, ${manifest.migrations.length} approved migration files; no SQL executed.`);
