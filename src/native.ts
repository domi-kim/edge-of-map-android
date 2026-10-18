// 네이티브 연결: 플랫폼 브리지, 생명주기, 뒤로 가기
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

export const isNative = Capacitor.isNativePlatform();

export function installBridge(): void {
  if (!isNative) return;
  (window as unknown as { weNative?: unknown }).weNative = {
    kind: 'capacitor',
    caps: { steam: false, cloud: false, ads: false, telemetry: true },
    openUrl: (url: string) => { if (/^https:\/\//.test(url)) window.open(url, '_blank', 'noopener,noreferrer'); },
    quit: () => { void App.minimizeApp(); },
  };
}

installBridge();

function goHidden(): void {
  window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
}

export function installLifecycle(onResume: () => void): void {
  if (!isNative) return;
  void App.addListener('pause', goHidden);
  void App.addListener('resume', () => {
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
    onResume();
  });
  void App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) history.back();
    else void App.minimizeApp();
  });
}
