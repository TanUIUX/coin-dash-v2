/* Coin Dash — main.js
   Khởi động game: khởi tạo module, gắn event (delegation — không tích lũy listener),
   loading flow, resize. */
(function () {
  "use strict";
  window.CoinDash = window.CoinDash || {};

  document.addEventListener("DOMContentLoaded", function () {
    const config = window.CoinDash.CONFIG;
    const canvas = document.getElementById("gameCanvas");
    const stage = document.getElementById("gameStage");
    const ui = new window.CoinDash.UIManager(config);

    if (!canvas || !canvas.getContext || !canvas.getContext("2d")) {
      ui.showCanvasError();
      return;
    }

    /* Debug mode: index.html?debug=1&seed=42 */
    const params = new URLSearchParams(window.location.search);
    const debugEnabled = params.get("debug") === "1";
    const seedParam = params.get("seed");
    const debugSeed = seedParam !== null && seedParam !== "" && !Number.isNaN(Number(seedParam))
      ? Number(seedParam)
      : null;

    const storage = new window.CoinDash.StorageManager(config);
    const audio = new window.CoinDash.AudioManager();
    const viewport = new window.CoinDash.ViewportManager(canvas, stage, config);
    const particles = new window.CoinDash.ParticleSystem(config.MAX_PARTICLES);
    const spawnDirector = new window.CoinDash.SpawnDirector(config);

    const game = new window.CoinDash.Game({
      canvas: canvas,
      config: config,
      storage: storage,
      audio: audio,
      ui: ui,
      viewport: viewport,
      particles: particles,
      spawnDirector: spawnDirector,
      debugEnabled: debugEnabled,
      debugSeed: debugSeed
    });
    window.CoinDash.gameInstance = game;

    /* Click overlay của modal => Hủy. */
    ui.onOverlayCancel = function () {
      game.cancelResetData();
    };

    /* Input: chỉ Canvas tap + phím mới jump; button không jump. */
    const input = new window.CoinDash.InputManager();
    input.on("jump", function () { game.handleJumpInput(); });
    input.on("pauseToggle", function () { game.handleEscape(); });
    input.on("confirm", function () { game.handleConfirm(); });
    input.setGameplayCheck(function () {
      return game.state === window.CoinDash.GAME_STATES.PLAYING;
    });
    input.attach(canvas);

    /* AudioContext cần cử chỉ người dùng đầu tiên (autoplay policy). */
    function unlockAudio() {
      audio.unlock();
    }
    document.addEventListener("pointerdown", unlockAudio, { capture: true });
    document.addEventListener("keydown", unlockAudio, { capture: true });

    /* Resize/orientation: cập nhật viewport, KHÔNG reset lượt chơi. */
    window.addEventListener("resize", function () { game.onResize(); });
    window.addEventListener("orientationchange", function () {
      window.setTimeout(function () { game.onResize(); }, 60);
    });

    /* Event delegation duy nhất cho mọi nút [data-action]. */
    const actions = {
      play: function () { game.startGame(); },
      characterSelect: function () { game.openScreen("CHARACTER_SELECT"); },
      howToPlay: function () { game.openScreen("HOW_TO_PLAY"); },
      missions: function () { game.openScreen("MISSIONS"); },
      settings: function () { game.openScreen("SETTINGS"); },
      backHome: function () { game.goHome(); },
      pause: function () { game.pauseGame(); },
      resume: function () { game.resumeGame(); },
      restart: function () { game.restartRun(); },
      returnHome: function () { game.goHome(); },
      toggleSoundQuick: function () { game.quickToggleSound(); },
      resetData: function () { game.requestResetData(); },
      cancelReset: function () { game.cancelResetData(); },
      confirmReset: function () { game.confirmResetData(); },
      skipTutorial: function () { game.skipTutorial(); },
      selectCharacter: function (button) { game.selectCharacter(button.dataset.characterId); },
      unlockCharacter: function (button) { game.unlockCharacter(button.dataset.characterId); }
    };

    document.addEventListener("click", function (event) {
      const button = event.target.closest ? event.target.closest("[data-action]") : null;
      if (!button || button.disabled) {
        return;
      }
      const handler = actions[button.dataset.action];
      if (!handler) {
        return;
      }
      handler(button);
      /* Bỏ focus sau click chuột/chạm để Space không kích hoạt lại nút
         (event.detail === 0 khi kích hoạt bằng bàn phím => giữ focus). */
      if (event.detail > 0 && typeof button.blur === "function") {
        button.blur();
      }
    });

    /* Switch settings. */
    const switchMap = {
      toggleSound: "soundEnabled",
      toggleMusic: "musicEnabled",
      toggleShake: "screenShakeEnabled",
      toggleReducedMotion: "reducedMotionEnabled"
    };
    for (const id of Object.keys(switchMap)) {
      const element = document.getElementById(id);
      if (element) {
        element.addEventListener("click", function (key) {
          game.toggleSetting(key);
        }.bind(null, switchMap[id]));
      }
    }

    /* Bắt đầu vòng lặp + loading flow. */
    game.start();
    let progress = 0;
    const loadingTimer = window.setInterval(function () {
      progress += 14 + Math.random() * 14;
      if (progress >= 100) {
        progress = 100;
        ui.setLoadingProgress(100);
        window.clearInterval(loadingTimer);
        window.setTimeout(function () {
          game.finishLoading();
        }, 180);
        return;
      }
      ui.setLoadingProgress(progress);
    }, 90);
  });
})();
