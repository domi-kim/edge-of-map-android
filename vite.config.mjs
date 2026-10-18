// 웹 번들 빌드 설정
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { loadEnv } from 'vite';

const here = dirname(fileURLToPath(import.meta.url));
const FE = resolve(here, process.env.GAME_SRC ?? 'game');
const API = process.env.API_URL ?? loadEnv('production', here, '').API_URL;
if (!API) throw new Error('.env 에 API_URL 을 지정하세요');
const OUT = resolve(here, 'www');
const otaCfg = JSON.parse(readFileSync(resolve(here, 'ota.config.json'), 'utf8'));
const OTA_URL = process.env.OTA_URL ?? `https://github.com/${otaCfg.repo}/releases/download/${otaCfg.channelTag}/ota.json`;

if (!existsSync(resolve(FE, 'src/games/worldexplorer'))) throw new Error(`게임 폴더를 찾을 수 없습니다: ${FE} (./game 링크 또는 GAME_SRC)`);
if (!existsSync(resolve(FE, 'node_modules/phaser'))) throw new Error(`게임 폴더에서 npm install 을 먼저 실행하세요: ${FE}`);

const buildTime = Date.now().toString();
const gameCommit = (() => { try { return execSync('git rev-parse --short HEAD', { cwd: FE }).toString().trim(); } catch { return 'unknown'; } })();

const appAssets = () => ({
  name: 'edge-app-assets',
  closeBundle() {
    const src = resolve(FE, 'public/assets/worldexplorer');
    const dst = resolve(OUT, 'assets/worldexplorer');
    mkdirSync(dirname(dst), { recursive: true });
    cpSync(src, dst, { recursive: true });
    writeFileSync(resolve(OUT, 'bundle.json'), JSON.stringify({ version: buildTime, gameCommit }, null, 2));
  },
});

export default ({ command }) => ({
  root: resolve(here, 'src'),
  base: './',
  publicDir: command === 'serve' ? resolve(FE, 'public') : false,
  resolve: { alias: { '@game': resolve(FE, 'src/games/worldexplorer'), phaser: resolve(FE, 'node_modules/phaser'), axios: resolve(FE, 'node_modules/axios') } },
  server: { fs: { allow: [here, FE] }, port: 5191, host: '127.0.0.1' },
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify(API),
    __BUILD_TIME__: JSON.stringify(buildTime),
    __OTA_URL__: JSON.stringify(OTA_URL),
    __APP_BUNDLE__: JSON.stringify({ version: buildTime, gameCommit }),
  },
  build: { outDir: OUT, emptyOutDir: true, chunkSizeWarningLimit: 4000, target: 'es2022' },
  plugins: [appAssets()],
});
