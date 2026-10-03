import { execFileSync } from 'node:child_process';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..', '..');
const runner = path.join(root, 'tests', 'support', 'backend_runner.py');

export function runBackend(...args) {
  const output = execFileSync('python', [runner, ...args], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  // Production adapters log expected upstream failures to stdout.  The bridge
  // emits its machine-readable result as the final line.
  const jsonLine = output.trim().split(/\r?\n/).at(-1);
  return JSON.parse(jsonLine);
}
