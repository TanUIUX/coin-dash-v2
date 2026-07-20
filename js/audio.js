/* Coin Dash — audio.js
   AudioManager: hiệu ứng âm thanh + nhạc nền bằng Web Audio API (không cần file asset).
   - Chỉ phát sau tương tác đầu tiên của người dùng (unlock).
   - Không bao giờ làm game crash nếu audio lỗi. */
(function () {
  "use strict";
  window.CoinDash = window.CoinDash || {};

  window.CoinDash.AudioManager = class AudioManager {
    constructor() {
      this.context = null;
      this.unlocked = false;
      this.soundEnabled = true;
      this.musicEnabled = true;
      this.suppressEffects = false;
      this.musicTimer = null;
      this.musicStep = 0;
      this.musicNotes = [523.25, 659.25, 783.99, 659.25, 587.33, 739.99, 880.0, 659.25];
      this.lastState = null;
    }

    /* Gọi sau tương tác đầu tiên (click/chạm/phím) để tuân thủ autoplay policy. */
    unlock() {
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) {
          return;
        }
        if (!this.context) {
          this.context = new Ctx();
        }
        if (this.context.state === "suspended") {
          this.context.resume().catch(function () { /* ignored */ });
        }
        if (!this.unlocked) {
          this.unlocked = true;
          /* Nếu unlock xảy ra sau khi đã vào trạng thái cần nhạc thì bật lại. */
          if (this.lastState) {
            this.syncWithState(this.lastState);
          }
        }
      } catch (error) {
        console.warn("CoinDash: Không thể khởi tạo audio.", error);
      }
    }

    beep(frequency, duration, type, volume, delaySeconds) {
      if (!this.context) {
        return;
      }
      try {
        const now = this.context.currentTime + (delaySeconds || 0);
        const oscillator = this.context.createOscillator();
        const gain = this.context.createGain();
        oscillator.type = type || "sine";
        oscillator.frequency.setValueAtTime(frequency, now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(volume || 0.06, now + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        oscillator.connect(gain);
        gain.connect(this.context.destination);
        oscillator.start(now);
        oscillator.stop(now + duration + 0.05);
      } catch (error) {
        console.warn("CoinDash: Lỗi phát âm thanh.", error);
      }
    }

    playEffect(name) {
      if (!this.soundEnabled || !this.unlocked || !this.context) {
        return;
      }
      if (this.suppressEffects && name !== "click") {
        return;
      }
      switch (name) {
        case "jump":
          this.beep(430, 0.12, "square", 0.045);
          break;
        case "double_jump":
          this.beep(570, 0.12, "square", 0.045);
          break;
        case "coin":
          this.beep(1046.5, 0.09, "triangle", 0.06);
          break;
        case "hit":
          this.beep(150, 0.24, "sawtooth", 0.07);
          break;
        case "game_over":
          this.beep(392, 0.18, "triangle", 0.06);
          this.beep(311.13, 0.18, "triangle", 0.06, 0.18);
          this.beep(233.08, 0.3, "triangle", 0.06, 0.36);
          break;
        case "unlock":
          this.beep(659.25, 0.1, "triangle", 0.055);
          this.beep(880, 0.16, "triangle", 0.055, 0.1);
          break;
        case "click":
          this.beep(320, 0.06, "sine", 0.035);
          break;
        default:
          break;
      }
    }

    musicTick() {
      if (!this.soundEnabled || !this.musicEnabled || !this.context || !this.unlocked) {
        return;
      }
      const note = this.musicNotes[this.musicStep % this.musicNotes.length];
      this.beep(note, 0.22, "sine", 0.028);
      if (this.musicStep % 4 === 0) {
        this.beep(note / 2, 0.3, "triangle", 0.02);
      }
      this.musicStep += 1;
    }

    startMusic() {
      if (this.musicTimer || !this.unlocked || !this.context) {
        return;
      }
      const self = this;
      this.musicTimer = window.setInterval(function () {
        self.musicTick();
      }, 250);
    }

    /* Pause giữ nguyên vị trí giai điệu để resume tiếp tục tại chỗ cũ. */
    pauseMusic() {
      if (this.musicTimer) {
        window.clearInterval(this.musicTimer);
        this.musicTimer = null;
      }
    }

    resumeMusic() {
      this.startMusic();
    }

    stopMusic() {
      this.pauseMusic();
      this.musicStep = 0;
    }

    setSoundEnabled(value) {
      this.soundEnabled = !!value;
    }

    setMusicEnabled(value) {
      this.musicEnabled = !!value;
      if (!this.musicEnabled) {
        this.stopMusic();
      }
    }

    /* Đồng bộ âm thanh với trạng thái game. */
    syncWithState(state) {
      this.lastState = state;
      const states = window.CoinDash.GAME_STATES;
      if (state === states.PLAYING) {
        this.suppressEffects = false;
        if (this.musicEnabled && this.soundEnabled) {
          this.resumeMusic();
        } else {
          this.pauseMusic();
        }
      } else if (state === states.PAUSED) {
        this.suppressEffects = true;
        this.pauseMusic();
      } else {
        this.suppressEffects = false;
        this.stopMusic();
      }
    }
  };
})();
