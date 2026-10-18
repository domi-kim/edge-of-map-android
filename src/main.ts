// 앱 진입점
import { installLifecycle } from './native';

import Phaser from 'phaser';
import { SplashScreen } from '@capacitor/splash-screen';
import TitleScene from '@game/scenes/TitleScene';
import WorldScene from '@game/scenes/WorldScene';
import { VIEW_H, VIEW_W } from '@game/core/constants';
import { installAudioResume } from '@game/render/audio';
import { getPlatform } from '@game/core/platform';
import { getSettings } from '@game/core/settings';
import { installServerSink } from '@game/net/telemetrySink';
import { otaBoot, otaCheck } from './ota';

getSettings();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  width: VIEW_W,
  height: VIEW_H,
  parent: 'game',
  backgroundColor: '#0a0a0a',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [TitleScene, WorldScene],
  callbacks: {
    postBoot: (g) => {
      g.registry.set('onClose', () => getPlatform().quit());
      g.registry.set('gameActive', false);
      installAudioResume(g);
      if (getPlatform().features.telemetry) installServerSink();
      void SplashScreen.hide().catch(() => undefined);
      void otaBoot().then((restarting) => { if (!restarting) void otaCheck(true); });
    },
  },
});
installLifecycle(() => { void otaCheck(); });
(window as unknown as { __WE_GAME__?: Phaser.Game }).__WE_GAME__ = game;
