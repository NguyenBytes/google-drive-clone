const { spawn } = require('node:child_process');
const path = require('node:path');

const children = [];
let stopping = false;

function stop(code) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;

  for (const child of children) {
    if (child.exitCode !== null || !child.pid) continue;
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(child.pid), '/T', '/F']);
    } else {
      try {
        process.kill(-child.pid, 'SIGTERM');
      } catch (error) {
        if (error.code !== 'ESRCH') console.error(error);
      }
    }
  }
}

for (const script of ['dev:server', 'tests:watch']) {
  const child = spawn(process.execPath, [process.env.npm_execpath, 'run', script], {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit',
    detached: process.platform !== 'win32',
  });

  children.push(child);
  child.on('error', (error) => {
    console.error(error);
    stop(1);
  });
  child.on('exit', (code) => stop(code ?? 1));
}

process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
