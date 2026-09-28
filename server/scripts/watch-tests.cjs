const { spawnSync } = require('node:child_process');
const path = require('node:path');

// Rebuild before every run so source edits are reflected in the tests.
const result = spawnSync(process.execPath, [process.env.npm_execpath, 'run', 'tests'], {
  cwd: path.resolve(__dirname, '..'),
  stdio: 'inherit',
});

if (result.error) console.error(result.error);
process.exitCode = result.status ?? 1;
