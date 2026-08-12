// Loads .env and forwards NG_APP_* vars to the Angular esbuild builder as
// --define=process.env.NG_APP_X=<value> so environment.ts's process.env
// reads get inlined at build time (the browser bundle has no `process`).
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

const defines = Object.entries(process.env)
  .filter(([key]) => key.startsWith('NG_APP_'))
  .map(([key, value]) => `--define=process.env.${key}=${JSON.stringify(value)}`);

const ngBin = fileURLToPath(
  new URL('../node_modules/@angular/cli/bin/ng.js', import.meta.url),
);

const result = spawnSync(process.execPath, [ngBin, ...process.argv.slice(2), ...defines], {
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
