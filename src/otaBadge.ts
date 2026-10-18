// 업데이트 표시: 타이틀 화면 아래에 받는 중 진행률 → 다 받으면 [지금 적용]
import type Phaser from 'phaser';

let root: HTMLDivElement | null = null;
let label: HTMLSpanElement | null = null;
let bar: HTMLDivElement | null = null;
let fill: HTMLDivElement | null = null;
let btn: HTMLButtonElement | null = null;
let state: 'hidden' | 'progress' | 'ready' = 'hidden';
let poll: number | null = null;

const onTitle = (): boolean => {
  const g = (window as unknown as { __WE_GAME__?: Phaser.Game }).__WE_GAME__;
  try { return !!g?.scene.isActive('WE_Title'); } catch { return false; }
};

function ensure(): void {
  if (root) return;
  root = document.createElement('div');
  root.style.cssText = 'position:fixed;left:calc(env(safe-area-inset-left) + 8px);top:calc(env(safe-area-inset-top) + 8px);z-index:10;'
    + 'display:none;align-items:center;gap:8px;padding:6px 12px;border-radius:999px;background:rgba(16,20,30,.9);border:1px solid #e8c56a;'
    + 'color:#ffe9a8;font:600 13px/1.2 "Noto Sans KR",sans-serif;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.4)';
  label = document.createElement('span');
  bar = document.createElement('div');
  bar.style.cssText = 'width:72px;height:6px;border-radius:3px;background:#3a3020;overflow:hidden';
  fill = document.createElement('div');
  fill.style.cssText = 'height:100%;width:0;background:#e8c56a;transition:width .2s';
  bar.appendChild(fill);
  btn = document.createElement('button');
  btn.style.cssText = 'border:0;border-radius:999px;padding:4px 10px;background:#2f7d4a;color:#fff;font:700 13px "Noto Sans KR",sans-serif';
  btn.textContent = '지금 적용';
  root.append(label, bar, btn);
  document.body.appendChild(root);
  poll = window.setInterval(sync, 700);
}

function sync(): void {
  if (!root) return;
  root.style.display = state !== 'hidden' && onTitle() ? 'flex' : 'none';
}

export function showProgress(frac: number): void {
  ensure();
  state = 'progress';
  label!.textContent = `업데이트 받는 중 ${Math.round(Math.max(0, Math.min(1, frac)) * 100)}%`;
  bar!.style.display = 'block'; fill!.style.width = `${Math.round(frac * 100)}%`;
  btn!.style.display = 'none';
  sync();
}

export function showReady(apply: () => void): void {
  ensure();
  state = 'ready';
  label!.textContent = '새 버전 준비됨';
  bar!.style.display = 'none';
  btn!.style.display = 'inline-block';
  btn!.onclick = () => { if (onTitle()) { btn!.disabled = true; label!.textContent = '적용하는 중…'; apply(); } };
  sync();
}

export function hideBadge(): void {
  state = 'hidden';
  if (poll !== null) { window.clearInterval(poll); poll = null; }
  root?.remove(); root = null;
}
