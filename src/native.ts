// 네이티브 연결: 플랫폼 브리지, 생명주기(백그라운드·나가기 = 저장 후 종료), 뒤로 가기
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import type Phaser from 'phaser';

export const isNative = Capacitor.isNativePlatform();

const EXIT_DELAY_MS = 800;
let exitTimer: number | null = null;

const game = (): Phaser.Game | undefined => (window as unknown as { __WE_GAME__?: Phaser.Game }).__WE_GAME__;

function saveRun(): void {
  try {
    const ws = game()?.scene.getScene('WE_World') as unknown as { sys?: { isActive(): boolean }; saveNow?: () => void } | undefined;
    if (ws?.sys?.isActive() && typeof ws.saveNow === 'function') ws.saveNow();
  } catch { /* 무시 */ }
}

function silence(on: boolean): void {
  try {
    const sm = game()?.sound as (Phaser.Sound.BaseSoundManager & { context?: AudioContext }) | undefined;
    if (!sm) return;
    if (on) { sm.pauseAll(); void sm.context?.suspend(); } else { void sm.context?.resume(); sm.resumeAll(); }
  } catch { /* 무시 */ }
}

function leave(): void {
  saveRun();
  silence(true);
  window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: false }));
  if (exitTimer === null) exitTimer = window.setTimeout(() => { void App.exitApp(); }, EXIT_DELAY_MS);
}

function cancelLeave(): void {
  if (exitTimer === null) return;
  window.clearTimeout(exitTimer);
  exitTimer = null;
  silence(false);
}

export function installBridge(): void {
  if (!isNative) return;
  (window as unknown as { weNative?: unknown }).weNative = {
    kind: 'capacitor',
    caps: { steam: false, cloud: false, ads: false, telemetry: true },
    openUrl: (url: string) => { if (/^https:\/\//.test(url)) window.open(url, '_blank', 'noopener,noreferrer'); },
    quit: leave,
  };
}

installBridge();

export function installLifecycle(onResume: () => void): void {
  if (!isNative) return;
  void App.addListener('pause', leave);
  void App.addListener('resume', () => {
    cancelLeave();
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
    onResume();
  });
  void App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) history.back();
    else leave();
  });
}
