// OTA 번들 만들기: npm run ota:build -- [--min-native <versionCode>] [--base <url>]
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const www = resolve(root, 'www');
if (!existsSync(resolve(www, 'bundle.json'))) throw new Error('www/bundle.json 이 없습니다. 먼저 npm run build');
const b = JSON.parse(readFileSync(resolve(www, 'bundle.json'), 'utf8'));

const gradle = resolve(root, 'android/app/build.gradle');
const vcInGradle = existsSync(gradle) ? Number(/versionCode\s+(\d+)/.exec(readFileSync(gradle, 'utf8'))?.[1] ?? 1) : 1;
const minNative = Number(arg('--min-native', vcInGradle));
const out = resolve(root, 'dist-ota');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const zipName = `bundle-${b.version}.zip`;
const zipPath = resolve(out, zipName);
execFileSync('zip', ['-qrX', zipPath, '.'], { cwd: www });
const checksum = createHash('sha256').update(readFileSync(zipPath)).digest('hex');
const cfg = JSON.parse(readFileSync(resolve(root, 'ota.config.json'), 'utf8'));
const base = (arg('--base', process.env.OTA_BASE ?? `https://github.com/${cfg.repo}/releases/download/ota-${b.version}`)).replace(/\/$/, '');
const manifest = { version: b.version, gameCommit: b.gameCommit, minNative, size: statSync(zipPath).size, checksum, url: base ? `${base}/${zipName}` : zipName, builtAt: new Date(Number(b.version)).toISOString() };
writeFileSync(resolve(out, 'ota.json'), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify(manifest, null, 2));
