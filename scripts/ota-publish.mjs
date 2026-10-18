// OTA 올리기(GitHub Releases): npm run ota:publish
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cfg = JSON.parse(readFileSync(resolve(root, 'ota.config.json'), 'utf8'));
const out = resolve(root, 'dist-ota');
const manifestPath = resolve(out, 'ota.json');
if (!existsSync(manifestPath)) throw new Error('dist-ota/ota.json 이 없습니다. npm run ota:build 먼저');
const m = JSON.parse(readFileSync(manifestPath, 'utf8'));
const zip = resolve(out, `bundle-${m.version}.zip`);
if (!existsSync(zip)) throw new Error(`zip 이 없습니다: ${zip}`);
if (!m.url.includes(cfg.repo)) throw new Error(`ota.json 의 url 이 이 저장소(${cfg.repo})를 가리키지 않습니다: ${m.url}`);

const gh = (...a) => execFileSync('gh', ['-R', cfg.repo, ...a], { stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();
const exists = (tag) => { try { gh('release', 'view', tag); return true; } catch { return false; } };

const tag = `ota-${m.version}`;
const notes = `게임 번들 ${m.version} (${m.builtAt})\n최소 앱 versionCode ${m.minNative} · ${(m.size / 1048576).toFixed(1)} MB · sha256 ${m.checksum}`;
if (!exists(tag)) gh('release', 'create', tag, '--title', `OTA ${m.version}`, '--notes', notes, '--latest=false', zip, manifestPath);
else gh('release', 'upload', tag, zip, manifestPath, '--clobber');
console.log(`① ${tag} 올림`);

if (!exists(cfg.channelTag)) gh('release', 'create', cfg.channelTag, '--title', 'OTA 채널(앱이 보는 ota.json)', '--notes', '앱이 이 릴리스의 ota.json 을 읽어 새 번들을 받습니다. 직접 지우지 마세요.', '--latest=false', manifestPath);
else gh('release', 'upload', cfg.channelTag, manifestPath, '--clobber');
console.log(`② ${cfg.channelTag}/ota.json → ${m.version}`);
console.log(`확인: curl -sL https://github.com/${cfg.repo}/releases/download/${cfg.channelTag}/ota.json`);
