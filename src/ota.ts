// 웹 번들 업데이트(OTA)
import { LiveUpdate } from '@capawesome/capacitor-live-update';
import { App } from '@capacitor/app';
import { isNative } from './native';
import { showProgress, showReady } from './otaBadge';

declare const __APP_BUNDLE__: { version: string; gameCommit: string };
declare const __OTA_URL__: string;

interface OtaManifest { version: string; url: string; checksum: string; minNative: number; gameCommit?: string; size?: number }

const K_NATIVE = 'edge_ota_native_vc';
const CHECK_GAP_MS = 30 * 60 * 1000;
let lastCheck = 0;
let busy = false;

const ls = {
  get: (k: string): string | null => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string): void => { try { localStorage.setItem(k, v); } catch { /* 무시 */ } },
};
const log = (...a: unknown[]): void => { console.info('[ota]', ...a); };

export const currentBundle = (): { version: string; gameCommit: string } => __APP_BUNDLE__;

export async function otaBoot(): Promise<boolean> {
  if (!isNative) return false;
  try {
    const r = await LiveUpdate.ready();
    if (r.rollback) log('이전 번들이 실패해 기본 번들로 돌아왔습니다', r.previousBundleId);
    const { versionCode } = await App.getInfo().then((i) => ({ versionCode: i.build }));
    const prev = ls.get(K_NATIVE);
    ls.set(K_NATIVE, versionCode);
    if (prev && prev !== versionCode) {
      const cur = await LiveUpdate.getCurrentBundle();
      if (cur.bundleId) {
        log('앱이 업데이트되어 기본 번들로 돌아갑니다', prev, '→', versionCode);
        await LiveUpdate.reset();
        await LiveUpdate.reload();
        return true;
      }
    }
  } catch (e) { log('boot 실패', e); }
  return false;
}

function applyNow(): void { void LiveUpdate.reload().catch(() => undefined); }

export async function otaCheck(force = false): Promise<void> {
  if (!isNative || !__OTA_URL__ || busy) return;
  if (!force && Date.now() - lastCheck < CHECK_GAP_MS) return;
  busy = true; lastCheck = Date.now();
  try {
    const res = await fetch(`${__OTA_URL__}${__OTA_URL__.includes('?') ? '&' : '?'}t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) { log('manifest', res.status); return; }
    const m = (await res.json()) as OtaManifest;
    if (!m || typeof m.version !== 'string' || typeof m.url !== 'string' || !/^https:\/\//.test(m.url)) return;
    const native = Number((await App.getInfo()).build) || 0;
    if (Number(m.version) <= Number(currentBundle().version)) return;
    if (native < (m.minNative ?? 0)) { log('스토어 업데이트가 필요한 번들', m.minNative, '>', native); return; }
    const next = await LiveUpdate.getNextBundle().catch(() => ({ bundleId: null as string | null }));
    if (next.bundleId === m.version) { showReady(applyNow); return; }
    const have = await LiveUpdate.getDownloadedBundles().catch(() => ({ bundleIds: [] as string[] }));
    if (!have.bundleIds.includes(m.version)) {
      log('새 번들 받는 중', m.version, m.size ?? '');
      showProgress(0);
      const sub = await LiveUpdate.addListener('downloadBundleProgress', (ev) => { if (ev.bundleId === m.version) showProgress(ev.progress); });
      try { await LiveUpdate.downloadBundle({ url: m.url, bundleId: m.version, checksum: m.checksum || undefined }); } finally { void sub.remove(); }
    }
    await LiveUpdate.setNextBundle({ bundleId: m.version });
    showReady(applyNow);
    log('다음 실행에 적용', m.version, m.gameCommit ?? '');
  } catch (e) {
    log('확인 실패', e);
  } finally { busy = false; }
}
