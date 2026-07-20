/* Coin Dash — ui.js
   UIManager: toàn bộ thao tác DOM — screens, HUD, modal (focus trap), toast, banner.
   Không chạy logic game; nhận dữ liệu từ Game và render. */
(function () {
  "use strict";
  window.CoinDash = window.CoinDash || {};

  const HEART_FULL = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.3S4 15 4 9.6C4 6.9 6.1 5 8.5 5c1.5 0 2.8.8 3.5 2 .7-1.2 2-2 3.5-2C17.9 5 20 6.9 20 9.6c0 5.4-8 10.7-8 10.7z" fill="#E17055" stroke="#27313F" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  const HEART_EMPTY = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.3S4 15 4 9.6C4 6.9 6.1 5 8.5 5c1.5 0 2.8.8 3.5 2 .7-1.2 2-2 3.5-2C17.9 5 20 6.9 20 9.6c0 5.4-8 10.7-8 10.7z" fill="#FFFFFF" fill-opacity="0.55" stroke="#27313F" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  const ICON_SOUND_ON = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4z" fill="currentColor"/><path d="M15 9c1 .8 1.6 1.9 1.6 3S16 14.2 15 15M17 6.5c1.8 1.3 2.9 3.3 2.9 5.5s-1.1 4.2-2.9 5.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  const ICON_SOUND_OFF = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4z" fill="currentColor"/><path d="M15.5 9.5l5 5M20.5 9.5l-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  const ICON_LOCK = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="5.5" y="10.5" width="13" height="9" rx="2.5" fill="#8A93A6" stroke="#27313F" stroke-width="1.6"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" fill="none" stroke="#27313F" stroke-width="1.8"/></svg>';
  const ICON_COIN = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="#FFC93C" stroke="#B57E14" stroke-width="2"/><circle cx="12" cy="12" r="5.4" fill="none" stroke="#D99A1F" stroke-width="1.8"/></svg>';

  window.CoinDash.UIManager = class UIManager {
    constructor(config) {
      this.config = config;
      this.el = {
        hud: document.getElementById("hud"),
        hudScore: document.getElementById("hudScore"),
        hudCoins: document.getElementById("hudCoins"),
        hudHearts: document.getElementById("hudHearts"),
        loadingBar: document.getElementById("loadingBar"),
        loadingFill: document.getElementById("loadingFill"),
        loadingText: document.getElementById("loadingText"),
        homeHighScore: document.getElementById("homeHighScore"),
        homeTotalCoins: document.getElementById("homeTotalCoins"),
        homeCharacterName: document.getElementById("homeCharacterName"),
        homeHeroCanvas: document.getElementById("homeHeroCanvas"),
        homeFeaturedMission: document.getElementById("homeFeaturedMission"),
        missionList: document.getElementById("missionList"),
        charTotalCoins: document.getElementById("charTotalCoins"),
        characterCards: document.getElementById("characterCards"),
        toggleSound: document.getElementById("toggleSound"),
        toggleMusic: document.getElementById("toggleMusic"),
        toggleShake: document.getElementById("toggleShake"),
        toggleReducedMotion: document.getElementById("toggleReducedMotion"),
        btnResetData: document.getElementById("btnResetData"),
        btnPauseSound: document.getElementById("btnPauseSound"),
        newRecordBadge: document.getElementById("newRecordBadge"),
        overScore: document.getElementById("overScore"),
        overHighScore: document.getElementById("overHighScore"),
        overCoins: document.getElementById("overCoins"),
        overTime: document.getElementById("overTime"),
        overRecordHint: document.getElementById("overRecordHint"),
        overMissionsProgress: document.getElementById("overMissionsProgress"),
        overMissions: document.getElementById("overMissions"),
        toastContainer: document.getElementById("toastContainer"),
        difficultyBanner: document.getElementById("difficultyBanner"),
        modalReset: document.getElementById("modalReset"),
        tutorialCallout: document.getElementById("tutorialCallout"),
        tutorialText: document.getElementById("tutorialText")
      };
      this.screens = Array.prototype.slice.call(document.querySelectorAll(".screen"));
      this.lastHud = { score: -1, coins: -1, health: -1 };
      this.lastFocusedBeforeModal = null;
      this.bannerTimer = null;
      this.characterPreviews = []; /* { canvas, colors } — game animate mỗi frame */
      this.heroColors = null;

      /* Focus trap cho modal (gắn một lần, không tích lũy listener). */
      document.addEventListener("keydown", this.handleModalKeydown.bind(this));
      /* Click overlay đóng modal; click trong card không đóng. */
      this.el.modalReset.addEventListener("click", function (event) {
        if (event.target === this.el.modalReset && this.onOverlayCancel) {
          this.onOverlayCancel();
        }
      }.bind(this));
    }

    /* ===== Screens ===== */

    showScreen(state) {
      const targetId = "screen-" + state;
      for (const screen of this.screens) {
        screen.hidden = screen.id !== targetId;
      }
      const hudVisible = state === "PLAYING" || state === "PAUSED";
      this.el.hud.hidden = !hudVisible;
      this.el.hud.classList.toggle("hud-inert", state !== "PLAYING");
      if (state !== "PLAYING") {
        this.hideTutorial();
      }
      if (state !== "LOADING" && state !== "PLAYING") {
        this.focusScreen(targetId);
      }
    }

    focusScreen(screenId) {
      const screen = document.getElementById(screenId);
      if (!screen) {
        return;
      }
      const target = screen.querySelector("[data-autofocus]") || screen.querySelector(".panel-heading, .home-title");
      if (target && typeof target.focus === "function") {
        try {
          target.focus({ preventScroll: true });
        } catch (error) {
          target.focus();
        }
      }
    }

    showCanvasError() {
      this.showScreen("CANVAS_ERROR");
    }

    setLoadingProgress(percent) {
      const clamped = Math.max(0, Math.min(100, Math.round(percent)));
      this.el.loadingFill.style.width = clamped + "%";
      this.el.loadingBar.setAttribute("aria-valuenow", String(clamped));
      this.el.loadingText.textContent = clamped >= 100 ? "Xong!" : "Đang tải… " + clamped + "%";
    }

    setReducedMotion(reduced) {
      document.body.classList.toggle("reduced-motion", !!reduced);
    }

    /* ===== HUD ===== */

    updateHUD(data) {
      if (data.score !== this.lastHud.score) {
        this.el.hudScore.textContent = String(data.score);
        this.lastHud.score = data.score;
      }
      if (data.coins !== this.lastHud.coins) {
        this.el.hudCoins.textContent = String(data.coins);
        this.lastHud.coins = data.coins;
      }
      if (data.health !== this.lastHud.health) {
        let html = "";
        for (let i = 0; i < data.maxHealth; i += 1) {
          html += i < data.health ? HEART_FULL : HEART_EMPTY;
        }
        this.el.hudHearts.innerHTML = html;
        this.el.hudHearts.setAttribute("aria-label", "Máu: " + data.health + "/" + data.maxHealth);
        this.lastHud.health = data.health;
      }
    }

    /* ===== Home ===== */

    updateHomeScreen(data) {
      this.el.homeHighScore.textContent = String(data.highScore);
      this.el.homeTotalCoins.textContent = String(data.totalCoins);
      this.el.homeCharacterName.textContent = data.character.name;
      this.heroColors = data.character.colors;
      this.el.homeFeaturedMission.innerHTML = this.missionCardInner(data.featuredMission, true);
    }

    /* Vẽ hero preview (mobile). game gọi mỗi frame khi ở HOME — cùng một rAF loop. */
    renderHomeHero(time) {
      const canvas = this.el.homeHeroCanvas;
      if (!this.heroColors || !canvas || canvas.offsetParent === null) {
        return;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      const bob = Math.sin(time * 2.2) * 4;
      ctx.translate(canvas.width / 2, canvas.height / 2 + 12 + bob);
      ctx.scale(1.85, 1.85);
      window.CoinDash.Draw.character(ctx, 64, 80, this.heroColors, { time: time, airborne: false, idle: true });
      ctx.restore();
    }

    /* ===== Mission cards ===== */

    missionCardInner(mission, featured) {
      if (!mission) {
        return '<p class="mission-eyebrow">Nhiệm vụ</p>' +
          '<p class="mission-title">Tất cả nhiệm vụ đã hoàn thành 🎉</p>' +
          '<p class="mission-desc">Hãy tiếp tục phá kỷ lục của chính bạn!</p>';
      }
      const percent = Math.round((mission.bestProgress / mission.target) * 100);
      let html = "";
      if (featured) {
        html += '<p class="mission-eyebrow">Nhiệm vụ tiếp theo</p>';
      }
      html += '<p class="mission-title">' + mission.title + "</p>";
      html += '<p class="mission-desc">' + mission.description + "</p>";
      html += '<div class="mission-progress-row">' +
        '<span class="mission-values">' + mission.bestProgress + " / " + mission.target + " " + mission.unit + "</span>" +
        (mission.completed
          ? '<span class="mission-done">Đã hoàn thành</span>'
          : '<span class="mission-reward">Thưởng: ' + mission.reward + " coin</span>") +
        "</div>";
      html += '<div class="progress-bar"><div class="progress-fill" style="width: ' + percent + '%"></div></div>';
      return html;
    }

    updateMissionsScreen(missions) {
      let html = "";
      for (const mission of missions) {
        html += '<div class="mission-card' + (mission.completed ? "" : " mission-card-featured") + '">' +
          this.missionCardInner(mission, false) + "</div>";
      }
      this.el.missionList.innerHTML = html;
    }

    /* ===== Character select ===== */

    updateCharacterScreen(characters, saveData) {
      this.el.charTotalCoins.textContent = String(saveData.totalCoins);
      this.el.characterCards.innerHTML = "";
      this.characterPreviews = [];

      for (const character of characters) {
        const unlocked = saveData.unlockedCharacters.indexOf(character.id) !== -1;
        const selected = saveData.selectedCharacter === character.id;
        const affordable = saveData.totalCoins >= character.price;

        const card = document.createElement("div");
        card.className = "char-card" + (selected ? " char-selected" : "") + (unlocked ? "" : " char-locked");

        let inner = "";
        if (selected) {
          inner += '<span class="char-badge">Đang chọn</span>';
        }
        inner += '<canvas class="char-canvas" width="96" height="110" aria-hidden="true"></canvas>';
        inner += '<p class="char-name">' + character.name + "</p>";
        if (unlocked) {
          inner += '<span class="char-status">' + (selected ? "Nhân vật hiện tại" : "Đã mở khóa") + "</span>";
          if (!selected) {
            inner += '<button class="btn btn-primary btn-small" data-action="selectCharacter" data-character-id="' + character.id + '">Chọn</button>';
          }
        } else {
          inner += '<span class="char-status">' + ICON_LOCK + "Chưa mở khóa</span>";
          inner += '<span class="char-price">' + ICON_COIN + character.price + "</span>";
          if (affordable) {
            inner += '<button class="btn btn-primary btn-small" data-action="unlockCharacter" data-character-id="' + character.id + '">Mở khóa</button>';
          } else {
            inner += '<button class="btn btn-primary btn-small" disabled>Thiếu ' + (character.price - saveData.totalCoins) + " coin</button>";
          }
        }
        card.innerHTML = inner;
        this.el.characterCards.appendChild(card);
        this.characterPreviews.push({
          canvas: card.querySelector(".char-canvas"),
          colors: character.colors
        });
      }
    }

    /* Idle animation cho preview nhân vật — game gọi mỗi frame khi ở CHARACTER_SELECT. */
    renderCharacterPreviews(time) {
      for (const preview of this.characterPreviews) {
        const ctx = preview.canvas.getContext("2d");
        if (!ctx) {
          continue;
        }
        ctx.clearRect(0, 0, preview.canvas.width, preview.canvas.height);
        ctx.save();
        const bob = Math.sin(time * 2.2) * 2;
        ctx.translate(preview.canvas.width / 2, preview.canvas.height / 2 + 6 + bob);
        window.CoinDash.Draw.character(ctx, 64, 80, preview.colors, { time: time, airborne: false, idle: true });
        ctx.restore();
      }
    }

    /* ===== Settings ===== */

    updateSettingsScreen(saveData) {
      this.el.toggleSound.setAttribute("aria-checked", String(saveData.soundEnabled));
      this.el.toggleMusic.setAttribute("aria-checked", String(saveData.musicEnabled));
      this.el.toggleShake.setAttribute("aria-checked", String(saveData.screenShakeEnabled));
      this.el.toggleReducedMotion.setAttribute("aria-checked", String(saveData.reducedMotionEnabled));
    }

    updatePauseSoundButton(enabled) {
      this.el.btnPauseSound.innerHTML = enabled ? ICON_SOUND_ON : ICON_SOUND_OFF;
      this.el.btnPauseSound.setAttribute("aria-label", enabled ? "Tắt âm thanh" : "Bật âm thanh");
    }

    /* ===== Game Over ===== */

    showGameOver(summary) {
      this.el.overScore.textContent = String(summary.score);
      this.el.overHighScore.textContent = String(summary.highScore);
      this.el.overCoins.textContent = String(summary.coins);
      this.el.overTime.textContent = summary.time + "s";
      this.el.newRecordBadge.hidden = !summary.isNewHighScore;
      if (!summary.isNewHighScore && summary.toRecord > 0) {
        this.el.overRecordHint.textContent = "Còn " + summary.toRecord + " điểm để phá kỷ lục";
        this.el.overRecordHint.hidden = false;
      } else {
        this.el.overRecordHint.hidden = true;
      }

      /* Tiến độ nhiệm vụ chưa xong. */
      let progressHtml = "";
      for (const mission of summary.missions) {
        if (mission.completed) {
          continue;
        }
        progressHtml += '<div class="mission-card">' + this.missionCardInner(mission, false) + "</div>";
      }
      this.el.overMissionsProgress.innerHTML = progressHtml;

      /* Nhiệm vụ hoàn thành trong lượt này. */
      let doneHtml = "";
      for (const title of summary.completedTitles) {
        doneHtml += '<p class="over-mission-done-row">✔ Hoàn thành: ' + title + "</p>";
      }
      this.el.overMissions.innerHTML = doneHtml;
    }

    /* ===== Tutorial callout ===== */

    showTutorial(text) {
      this.el.tutorialText.textContent = text;
      this.el.tutorialCallout.hidden = false;
    }

    hideTutorial() {
      this.el.tutorialCallout.hidden = true;
    }

    /* ===== Reset modal (focus trap + restore focus) ===== */

    isModalOpen() {
      return !this.el.modalReset.hidden;
    }

    showResetConfirmation(show) {
      if (show) {
        this.lastFocusedBeforeModal = document.activeElement;
        this.el.modalReset.hidden = false;
        const cancel = this.el.modalReset.querySelector("[data-autofocus]");
        if (cancel) {
          cancel.focus();
        }
      } else {
        this.el.modalReset.hidden = true;
        const restore = this.lastFocusedBeforeModal || this.el.btnResetData;
        if (restore && typeof restore.focus === "function" && document.contains(restore)) {
          restore.focus();
        }
        this.lastFocusedBeforeModal = null;
      }
    }

    handleModalKeydown(event) {
      if (!this.isModalOpen() || event.key !== "Tab") {
        return;
      }
      const focusables = this.el.modalReset.querySelectorAll("button:not([disabled])");
      if (focusables.length === 0) {
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      } else if (!this.el.modalReset.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      }
    }

    /* ===== Toast + banner ===== */

    showToast(text) {
      const toast = document.createElement("div");
      toast.className = "toast";
      toast.textContent = text;
      this.el.toastContainer.appendChild(toast);
      window.setTimeout(function () {
        toast.remove();
      }, 2600);
    }

    showDifficultyBanner(text) {
      this.el.difficultyBanner.textContent = text;
      this.el.difficultyBanner.hidden = false;
      if (this.bannerTimer) {
        window.clearTimeout(this.bannerTimer);
      }
      this.bannerTimer = window.setTimeout(function () {
        this.el.difficultyBanner.hidden = true;
      }.bind(this), 1800);
    }
  };
})();
