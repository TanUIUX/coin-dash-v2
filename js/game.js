/* Coin Dash — game.js
   Game: state machine + vòng lặp rAF duy nhất + update/render thế giới.
   Physics dùng world units; render qua ViewportManager (không kéo méo). */
(function () {
  "use strict";
  window.CoinDash = window.CoinDash || {};
  const STATES = window.CoinDash.GAME_STATES;

  window.CoinDash.Game = class Game {
    constructor(options) {
      this.canvas = options.canvas;
      this.ctx = this.canvas.getContext("2d");
      this.config = options.config;
      this.storage = options.storage;
      this.audio = options.audio;
      this.ui = options.ui;
      this.viewport = options.viewport;
      this.particles = options.particles;
      this.spawnDirector = options.spawnDirector;
      this.debugEnabled = !!options.debugEnabled;
      this.debugSeed = typeof options.debugSeed === "number" ? options.debugSeed : null;

      this.saveData = this.storage.load();
      this.missionManager = new window.CoinDash.MissionManager(
        this.config.MISSIONS,
        this.saveData.missionProgress
      );
      this.player = new window.CoinDash.Player(this.config);

      this.state = STATES.LOADING;
      this.obstacles = [];
      this.coins = [];
      this.effects = [];
      this.elapsedTime = 0;
      this.runCoins = 0;
      this.score = 0;
      this.currentGameSpeed = this.config.BASE_GAME_SPEED;
      this.difficultyIndex = 0;
      this.scrollX = 0;
      this.shakeTimer = 0;
      this.hitStopTimer = 0;
      this.jumpBufferTimer = 0;
      this.attractTime = 0;
      this.lastTimestamp = null;
      this.rafId = null;
      this.runFinalized = true;
      this.runCompletedTitles = [];
      this.tutorial = { active: false, step: 0 };

      this.systemReducedMotionQuery = window.matchMedia
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;
    }

    /* ===== Helpers ===== */

    isReducedMotion() {
      const system = !!(this.systemReducedMotionQuery && this.systemReducedMotionQuery.matches);
      return system || this.saveData.reducedMotionEnabled === true;
    }

    applySettings() {
      const reduced = this.isReducedMotion();
      this.particles.setReducedMotion(reduced);
      this.ui.setReducedMotion(reduced);
      this.audio.setSoundEnabled(this.saveData.soundEnabled);
      this.audio.setMusicEnabled(this.saveData.musicEnabled);
    }

    getSelectedCharacter() {
      for (const character of this.config.CHARACTERS) {
        if (character.id === this.saveData.selectedCharacter) {
          return character;
        }
      }
      return this.config.CHARACTERS[0];
    }

    getDifficulty() {
      return this.config.DIFFICULTIES[this.difficultyIndex];
    }

    /* ===== State machine ===== */

    setState(next) {
      const allowed = window.CoinDash.VALID_TRANSITIONS[this.state] || [];
      if (allowed.indexOf(next) === -1) {
        console.warn("CoinDash: chuyển state không hợp lệ", this.state, "->", next);
        return false;
      }
      this.state = next;
      this.ui.showScreen(next);
      return true;
    }

    /* ===== Lifecycle ===== */

    start() {
      this.applySettings();
      this.ui.showScreen(STATES.LOADING);
      const loop = this.gameLoop.bind(this);
      this.rafId = window.requestAnimationFrame(loop);
    }

    finishLoading() {
      if (this.state !== STATES.LOADING) {
        return;
      }
      this.refreshHomeScreen();
      this.setState(STATES.HOME);
    }

    refreshHomeScreen() {
      this.ui.updateHomeScreen({
        highScore: this.saveData.highScore,
        totalCoins: this.saveData.totalCoins,
        character: this.getSelectedCharacter(),
        featuredMission: this.missionManager.getFeatured()
      });
    }

    openScreen(name) {
      if (this.state !== STATES.HOME) {
        return;
      }
      if (name === STATES.CHARACTER_SELECT) {
        this.ui.updateCharacterScreen(this.config.CHARACTERS, this.saveData);
      } else if (name === STATES.MISSIONS) {
        this.ui.updateMissionsScreen(this.missionManager.getMissions());
      } else if (name === STATES.SETTINGS) {
        this.ui.updateSettingsScreen(this.saveData);
      }
      this.setState(name);
    }

    goHome() {
      if (this.state === STATES.PAUSED && !this.runFinalized) {
        this.finalizeRun();
      }
      this.refreshHomeScreen();
      this.setState(STATES.HOME);
    }

    /* ===== Run lifecycle ===== */

    startGame() {
      if (this.state !== STATES.HOME) {
        return;
      }
      this.resetRun();
      this.setState(STATES.PLAYING);
    }

    restartRun() {
      if (this.state !== STATES.PAUSED && this.state !== STATES.GAME_OVER) {
        return;
      }
      if (this.state === STATES.PAUSED && !this.runFinalized) {
        this.finalizeRun();
      }
      this.resetRun();
      this.setState(STATES.PLAYING);
    }

    resetRun() {
      this.player.reset();
      this.player.x = this.viewport.getPlayerX();
      this.obstacles = [];
      this.coins = [];
      this.effects = [];
      this.particles.clear();
      this.elapsedTime = 0;
      this.runCoins = 0;
      this.score = 0;
      this.currentGameSpeed = this.config.BASE_GAME_SPEED;
      this.difficultyIndex = 0;
      this.shakeTimer = 0;
      this.hitStopTimer = 0;
      this.jumpBufferTimer = 0;
      this.runFinalized = false;
      this.runCompletedTitles = [];

      this.tutorial = {
        active: this.saveData.tutorialCompleted !== true,
        step: 0
      };
      this.spawnDirector.reset({
        seed: this.debugSeed,
        tutorialActive: this.tutorial.active
      });
      this.spawnDirector.prepareRun(this.getDifficulty(), this.currentGameSpeed);

      /* Hàng coin chào sân ngay trước mặt player. */
      for (let i = 0; i < 5; i += 1) {
        this.coins.push(window.CoinDash.CoinPatternFactory.makeCoin(
          this.player.x + 320 + i * 52,
          this.config.GROUND_Y - 110
        ));
      }

      this.ui.updateHUD({
        score: 0,
        coins: 0,
        health: this.player.health,
        maxHealth: this.player.maxHealth
      });
      if (this.tutorial.active) {
        this.ui.showTutorial("Chạm hoặc nhấn Space để nhảy");
      } else {
        this.ui.hideTutorial();
      }
    }

    pauseGame() {
      if (this.state !== STATES.PLAYING) {
        return;
      }
      this.setState(STATES.PAUSED);
      this.ui.updatePauseSoundButton(this.saveData.soundEnabled);
    }

    resumeGame() {
      if (this.state !== STATES.PAUSED) {
        return;
      }
      this.setState(STATES.PLAYING);
      if (this.tutorial.active) {
        this.ui.showTutorial(this.tutorial.step === 0
          ? "Chạm hoặc nhấn Space để nhảy"
          : "Chạm lần nữa để nhảy kép");
      }
    }

    endRun() {
      this.finalizeRun();
      this.setState(STATES.GAME_OVER);
      this.audio.playEffect("game_over");
    }

    finalizeRun() {
      if (this.runFinalized) {
        return;
      }
      this.runFinalized = true;

      const runStats = {
        runCoins: this.runCoins,
        score: this.score,
        elapsedTime: this.elapsedTime
      };
      this.grantMissionRewards(this.missionManager.check(runStats));

      const previousHighScore = this.saveData.highScore;
      const isNewHighScore = this.score > previousHighScore;
      this.saveData.highScore = Math.max(this.saveData.highScore, this.score);
      this.saveData.bestTime = Math.max(this.saveData.bestTime, Math.floor(this.elapsedTime));
      this.saveData.totalRuns += 1;
      this.saveData.totalCoins += this.runCoins;
      this.saveData.missionProgress = this.missionManager.serialize();
      this.storage.save(this.saveData);

      this.ui.showGameOver({
        score: this.score,
        highScore: this.saveData.highScore,
        coins: this.runCoins,
        time: Math.floor(this.elapsedTime),
        isNewHighScore: isNewHighScore,
        toRecord: isNewHighScore ? 0 : Math.max(0, previousHighScore - this.score),
        missions: this.missionManager.getMissions(),
        completedTitles: this.runCompletedTitles
      });
    }

    grantMissionRewards(completedNow) {
      for (const mission of completedNow) {
        this.saveData.totalCoins += mission.reward;
        this.runCompletedTitles.push(mission.title);
        this.ui.showToast("Hoàn thành: " + mission.title + " (+" + mission.reward + " coin)");
        this.audio.playEffect("mission");
      }
    }

    /* ===== Input handlers ===== */

    handleJumpInput() {
      if (this.state !== STATES.PLAYING) {
        return;
      }
      const result = this.player.jump();
      if (result) {
        this.onJumped(result);
      } else {
        /* Jump buffer ~100ms: giữ lệnh nhảy, thử lại khi chạm đất. */
        this.jumpBufferTimer = this.config.JUMP_BUFFER_TIME;
      }
    }

    onJumped(result) {
      this.audio.playEffect(result === "double_jump" ? "double_jump" : "jump");
      if (result === "double_jump") {
        this.particles.ring(
          this.player.x + this.player.width / 2,
          this.player.y + this.player.height,
          "rgba(255, 255, 255, 0.9)"
        );
      }
      if (this.tutorial.active) {
        if (this.tutorial.step === 0) {
          this.tutorial.step = 1;
          this.ui.showTutorial("Chạm lần nữa để nhảy kép");
        } else if (this.tutorial.step === 1 && result === "double_jump") {
          this.tutorial.step = 2;
          this.ui.hideTutorial();
        }
      }
    }

    handleEscape() {
      if (this.ui.isModalOpen()) {
        this.cancelResetData();
        return;
      }
      if (this.state === STATES.PLAYING) {
        this.pauseGame();
      } else if (this.state === STATES.PAUSED) {
        this.resumeGame();
      }
    }

    handleConfirm() {
      if (this.state === STATES.GAME_OVER) {
        this.restartRun();
      } else if (this.state === STATES.HOME) {
        this.startGame();
      }
    }

    /* ===== Tutorial ===== */

    skipTutorial() {
      this.completeTutorial(false);
    }

    completeTutorial(celebrate) {
      if (!this.tutorial.active) {
        return;
      }
      this.tutorial.active = false;
      this.saveData.tutorialCompleted = true;
      this.storage.save(this.saveData);
      this.ui.hideTutorial();
      if (celebrate) {
        this.ui.showToast("Hướng dẫn hoàn tất. Chúc chạy xa!");
      }
    }

    /* ===== Characters ===== */

    selectCharacter(characterId) {
      if (this.saveData.unlockedCharacters.indexOf(characterId) === -1) {
        return;
      }
      this.saveData.selectedCharacter = characterId;
      this.storage.save(this.saveData);
      this.ui.updateCharacterScreen(this.config.CHARACTERS, this.saveData);
      this.audio.playEffect("click");
    }

    unlockCharacter(characterId) {
      let character = null;
      for (const c of this.config.CHARACTERS) {
        if (c.id === characterId) {
          character = c;
        }
      }
      if (!character) {
        return;
      }
      /* Guard: không trừ coin hai lần khi bấm nhanh. */
      if (this.saveData.unlockedCharacters.indexOf(characterId) !== -1) {
        return;
      }
      if (this.saveData.totalCoins < character.price) {
        this.ui.showToast("Bạn chưa đủ coin");
        return;
      }
      this.saveData.totalCoins -= character.price;
      this.saveData.unlockedCharacters.push(characterId);
      this.saveData.selectedCharacter = characterId;
      this.storage.save(this.saveData);
      this.ui.updateCharacterScreen(this.config.CHARACTERS, this.saveData);
      this.ui.showToast("Đã mở khóa " + character.name + "!");
      this.audio.playEffect("unlock");
    }

    /* ===== Settings ===== */

    toggleSetting(key) {
      if (["soundEnabled", "musicEnabled", "screenShakeEnabled", "reducedMotionEnabled"].indexOf(key) === -1) {
        return;
      }
      this.saveData[key] = !this.saveData[key];
      this.storage.save(this.saveData);
      this.applySettings();
      this.ui.updateSettingsScreen(this.saveData);
    }

    quickToggleSound() {
      this.saveData.soundEnabled = !this.saveData.soundEnabled;
      this.storage.save(this.saveData);
      this.audio.setSoundEnabled(this.saveData.soundEnabled);
      this.ui.updatePauseSoundButton(this.saveData.soundEnabled);
      this.ui.updateSettingsScreen(this.saveData);
    }

    requestResetData() {
      this.ui.showResetConfirmation(true);
    }

    cancelResetData() {
      this.ui.showResetConfirmation(false);
    }

    confirmResetData() {
      this.saveData = this.storage.reset();
      this.storage.save(this.saveData);
      this.missionManager = new window.CoinDash.MissionManager(
        this.config.MISSIONS,
        this.saveData.missionProgress
      );
      this.applySettings();
      this.ui.updateSettingsScreen(this.saveData);
      this.ui.showResetConfirmation(false);
      this.ui.showToast("Đã khôi phục dữ liệu mặc định");
    }

    /* ===== Resize (không reset lượt chơi) ===== */

    onResize() {
      this.viewport.resize();
      this.player.x = this.viewport.getPlayerX();
    }

    /* ===== Vòng lặp ===== */

    gameLoop(timestamp) {
      if (this.lastTimestamp === null) {
        this.lastTimestamp = timestamp;
      }
      const deltaTime = Math.min((timestamp - this.lastTimestamp) / 1000, 0.05);
      this.lastTimestamp = timestamp;

      if (this.shakeTimer > 0) {
        this.shakeTimer = Math.max(0, this.shakeTimer - deltaTime);
      }

      if (this.state === STATES.PLAYING) {
        if (this.hitStopTimer > 0) {
          /* Hit-stop 40–60ms: đóng băng update, vẫn render. */
          this.hitStopTimer -= deltaTime;
        } else {
          this.update(deltaTime);
        }
      } else if (this.state === STATES.HOME || this.state === STATES.LOADING ||
        this.state === STATES.HOW_TO_PLAY || this.state === STATES.MISSIONS ||
        this.state === STATES.SETTINGS || this.state === STATES.CHARACTER_SELECT) {
        this.attractTime += deltaTime;
      }

      this.render();

      if (this.state === STATES.HOME) {
        this.ui.renderHomeHero(this.attractTime);
      } else if (this.state === STATES.CHARACTER_SELECT) {
        this.ui.renderCharacterPreviews(this.attractTime);
      }

      this.rafId = window.requestAnimationFrame(this.gameLoop.bind(this));
    }

    update(deltaTime) {
      this.elapsedTime += deltaTime;
      this.currentGameSpeed = Math.min(
        this.config.BASE_GAME_SPEED + this.elapsedTime * this.config.SPEED_INCREASE_PER_SECOND,
        this.config.MAX_GAME_SPEED
      );
      this.updateDifficulty();

      this.player.update(deltaTime);

      /* Jump buffer: thử lại lệnh nhảy đã giữ — CHỈ cho cú nhảy đầu
         (tránh buffer tạo triple jump). */
      if (this.jumpBufferTimer > 0) {
        this.jumpBufferTimer -= deltaTime;
        if (this.player.isGrounded) {
          const result = this.player.jump();
          if (result) {
            this.onJumped(result);
            this.jumpBufferTimer = 0;
          }
        }
      }

      const travel = this.currentGameSpeed * deltaTime;
      this.scrollX += travel;

      for (const obstacle of this.obstacles) {
        obstacle.update(deltaTime, this.currentGameSpeed);
      }
      for (const coin of this.coins) {
        coin.update(deltaTime, this.currentGameSpeed);
      }
      this.spawnDirector.update(this, travel);

      this.checkCollisions();

      /* Tutorial: vượt vật cản đầu tiên => hoàn thành. */
      if (this.tutorial.active) {
        for (const obstacle of this.obstacles) {
          if (obstacle.isTutorialObstacle && obstacle.x + obstacle.width < this.player.x) {
            this.completeTutorial(true);
            break;
          }
        }
      }

      this.score = Math.floor(this.elapsedTime * this.config.SCORE_PER_SECOND) +
        this.runCoins * this.config.SCORE_PER_COIN;

      /* Nhiệm vụ: cập nhật bestProgress in-memory + trao thưởng ngay khi đạt. */
      const runStats = {
        runCoins: this.runCoins,
        score: this.score,
        elapsedTime: this.elapsedTime
      };
      this.missionManager.updateProgress(runStats);
      this.grantMissionRewards(this.missionManager.check(runStats));

      /* Floating effects. */
      const aliveEffects = [];
      for (const effect of this.effects) {
        effect.age += deltaTime;
        if (effect.age < effect.life) {
          aliveEffects.push(effect);
        }
      }
      this.effects = aliveEffects;

      this.particles.update(deltaTime);

      this.obstacles = this.obstacles.filter(function (o) { return o.active; });
      this.coins = this.coins.filter(function (c) { return c.active; });

      this.ui.updateHUD({
        score: this.score,
        coins: this.runCoins,
        health: Math.max(0, this.player.health),
        maxHealth: this.player.maxHealth
      });

      if (this.player.health <= 0) {
        this.endRun();
      }
    }

    updateDifficulty() {
      let index = 0;
      for (let i = 0; i < this.config.DIFFICULTIES.length; i += 1) {
        if (this.elapsedTime >= this.config.DIFFICULTIES[i].minTime) {
          index = i;
        }
      }
      if (index !== this.difficultyIndex) {
        this.difficultyIndex = index;
        this.ui.showDifficultyBanner("Độ khó: " + this.getDifficulty().label);
      }
    }

    checkCollisions() {
      const collision = window.CoinDash.Collision;
      const playerBox = this.player.getHitbox();

      for (const obstacle of this.obstacles) {
        if (obstacle.hasHitPlayer) {
          continue;
        }
        if (collision.intersectsAABB(playerBox, obstacle.getHitbox())) {
          this.handlePlayerDamage(obstacle);
        }
      }

      for (const coin of this.coins) {
        if (coin.collected) {
          continue;
        }
        if (collision.circleIntersectsRectangle(
          { x: coin.x, y: coin.y, radius: coin.radius }, playerBox)) {
          this.collectCoin(coin);
        }
      }
    }

    handlePlayerDamage(obstacle) {
      if (!this.player.takeDamage()) {
        return;
      }
      obstacle.hasHitPlayer = true;
      this.audio.playEffect("hit");
      const reduced = this.isReducedMotion();
      if (!reduced) {
        this.hitStopTimer = this.config.HIT_STOP_DURATION;
        if (this.saveData.screenShakeEnabled) {
          this.shakeTimer = this.config.SHAKE_DURATION;
        }
      }
      this.particles.burst(
        this.player.x + this.player.width / 2,
        this.player.y + this.player.height / 2,
        { count: 10, colors: ["#E17055", "#FAD3C4"], speed: 280 }
      );
    }

    collectCoin(coin) {
      coin.collected = true;
      coin.active = false;
      this.runCoins += coin.value;
      this.audio.playEffect("coin");
      this.particles.burst(coin.x, coin.y, {
        count: 8,
        colors: ["#FFC93C", "#FFF3C9"],
        speed: 220
      });
      if (this.effects.length < this.config.MAX_EFFECTS) {
        this.effects.push({ text: "+1", x: coin.x, y: coin.y - 26, age: 0, life: 0.7 });
      }
    }

    /* ===== Render ===== */

    render() {
      const ctx = this.ctx;
      this.viewport.clear(ctx);
      this.viewport.apply(ctx);

      if (this.shakeTimer > 0) {
        const magnitude = this.config.SHAKE_MAGNITUDE * (this.shakeTimer / this.config.SHAKE_DURATION);
        ctx.translate(
          (Math.random() - 0.5) * 2 * magnitude,
          (Math.random() - 0.5) * 2 * magnitude
        );
      }

      const inRun = this.state === STATES.PLAYING ||
        this.state === STATES.PAUSED ||
        this.state === STATES.GAME_OVER;
      const scroll = inRun ? this.scrollX : this.attractTime * 60;

      this.renderBackground(ctx, scroll);

      if (inRun) {
        this.renderWorld(ctx);
      } else {
        this.renderAttract(ctx);
      }

      this.particles.render(ctx);
      this.renderEffects(ctx);

      if (this.debugEnabled && inRun) {
        this.renderDebug(ctx);
      }
    }

    renderBackground(ctx, scroll) {
      const colors = this.config.COLORS;
      const vw = this.viewport.visibleWorldWidth;
      const top = this.viewport.worldTop;
      const groundY = this.config.GROUND_Y;

      /* Bầu trời 2 tông (ít gradient). */
      ctx.fillStyle = colors.sky;
      ctx.fillRect(0, top, vw, groundY - top);
      ctx.fillStyle = colors.skyTop;
      ctx.fillRect(0, top, vw, (groundY - top) * 0.38);

      /* Mặt trời nhạt (khác hẳn màu coin vàng đậm). */
      ctx.fillStyle = colors.sun;
      ctx.beginPath();
      ctx.arc(vw - 180, top + 120, 58, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = colors.sunCore;
      ctx.beginPath();
      ctx.arc(vw - 180, top + 120, 40, 0, Math.PI * 2);
      ctx.fill();

      /* Parallax 1: núi xa (0.08). */
      ctx.fillStyle = "#C7E4F2";
      const mountainWidth = 520;
      let startX = -((scroll * 0.08) % mountainWidth) - mountainWidth;
      for (let x = startX; x < vw + mountainWidth; x += mountainWidth) {
        ctx.beginPath();
        ctx.moveTo(x, groundY);
        ctx.lineTo(x + mountainWidth * 0.5, groundY - 300);
        ctx.lineTo(x + mountainWidth, groundY);
        ctx.closePath();
        ctx.fill();
      }

      /* Parallax 2: mây (0.18). */
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      const cloudWidth = 460;
      startX = -((scroll * 0.18) % cloudWidth) - cloudWidth;
      for (let x = startX; x < vw + cloudWidth; x += cloudWidth) {
        ctx.beginPath();
        ctx.ellipse(x + 90, top + 150, 52, 20, 0, 0, Math.PI * 2);
        ctx.ellipse(x + 130, top + 138, 38, 16, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x + 300, top + 230, 44, 17, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      /* Parallax 3: đồi gần (0.45). */
      ctx.fillStyle = "#BFE6B8";
      const hillWidth = 400;
      startX = -((scroll * 0.45) % hillWidth) - hillWidth;
      for (let x = startX; x < vw + hillWidth; x += hillWidth) {
        ctx.beginPath();
        ctx.arc(x + hillWidth / 2, groundY + 60, 190, Math.PI, 0);
        ctx.fill();
      }

      /* Mặt đất + texture nhẹ (parallax 1.0). */
      ctx.fillStyle = colors.ground;
      ctx.fillRect(0, groundY, vw, this.config.WORLD_HEIGHT - groundY);
      ctx.fillStyle = colors.groundDark;
      ctx.fillRect(0, groundY, vw, 12);
      const dashWidth = 90;
      startX = -(scroll % dashWidth) - dashWidth;
      ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
      for (let x = startX; x < vw + dashWidth; x += dashWidth) {
        ctx.fillRect(x, groundY + 34, 34, 6);
        ctx.fillRect(x + 48, groundY + 66, 20, 5);
      }
    }

    renderWorld(ctx) {
      const groundY = this.config.GROUND_Y;
      for (const obstacle of this.obstacles) {
        obstacle.renderShadow(ctx, groundY);
      }
      for (const obstacle of this.obstacles) {
        obstacle.render(ctx);
      }
      for (const coin of this.coins) {
        coin.render(ctx);
      }
      this.player.render(ctx, this.getSelectedCharacter(), this.isReducedMotion());
    }

    /* Attract scene cho Home: hero idle + coin trang trí + thùng gỗ. */
    renderAttract(ctx) {
      const groundY = this.config.GROUND_Y;
      const vw = this.viewport.visibleWorldWidth;
      /* Stage rộng (desktop): hero đứng ở ~52% để không bị khối CTA bên trái che. */
      const wide = vw > 900;
      const heroX = wide ? vw * 0.52 : this.viewport.getPlayerX();
      const reduced = this.isReducedMotion();
      const time = reduced ? 0 : this.attractTime;

      /* Coin trang trí theo vòng cung. */
      for (let i = 0; i < 4; i += 1) {
        const x = heroX + 200 + i * 88;
        const y = groundY - 120 - Math.sin((i / 3) * Math.PI) * 70;
        if (x > vw - 40) {
          continue;
        }
        ctx.fillStyle = "#FFC93C";
        ctx.beginPath();
        ctx.arc(x, y, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#B57E14";
        ctx.lineWidth = 3.5;
        ctx.stroke();
        ctx.strokeStyle = "rgba(255, 243, 201, 0.95)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x - 2, y - 2, 9, Math.PI * 1.05, Math.PI * 1.55);
        ctx.stroke();
      }

      /* Thùng gỗ minh họa phía xa. */
      if (vw > 700) {
        const crateX = vw - 220;
        ctx.fillStyle = "rgba(31, 41, 55, 0.16)";
        ctx.beginPath();
        ctx.ellipse(crateX + 36, groundY + 8, 40, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#C98A4B";
        window.CoinDash.Draw.roundRect(ctx, crateX, groundY - 64, 72, 64, 8);
        ctx.fill();
        ctx.strokeStyle = "#27313F";
        ctx.lineWidth = 3;
        window.CoinDash.Draw.roundRect(ctx, crateX, groundY - 64, 72, 64, 8);
        ctx.stroke();
      }

      /* Hero idle đứng trên mặt đất. */
      const bob = reduced ? 0 : Math.sin(time * 2.2) * 3;
      ctx.save();
      const heroScale = wide ? 1.7 : 1.15;
      ctx.translate(heroX + 32, groundY - 40 + bob);
      ctx.scale(heroScale, heroScale);
      window.CoinDash.Draw.character(ctx, 64, 80, this.getSelectedCharacter().colors, {
        time: time,
        airborne: false,
        idle: true
      });
      ctx.restore();
    }

    renderEffects(ctx) {
      for (const effect of this.effects) {
        const t = effect.age / effect.life;
        ctx.globalAlpha = 1 - t;
        ctx.font = "800 30px 'Trebuchet MS', sans-serif";
        ctx.textAlign = "center";
        ctx.lineWidth = 4;
        ctx.strokeStyle = "#27313F";
        ctx.strokeText(effect.text, effect.x, effect.y - t * 56);
        ctx.fillStyle = "#FFF3C9";
        ctx.fillText(effect.text, effect.x, effect.y - t * 56);
      }
      ctx.globalAlpha = 1;
      ctx.textAlign = "start";
    }

    renderDebug(ctx) {
      const top = this.viewport.worldTop;
      ctx.strokeStyle = "#FF00AA";
      ctx.lineWidth = 2;
      const p = this.player.getHitbox();
      ctx.strokeRect(p.x, p.y, p.width, p.height);
      for (const obstacle of this.obstacles) {
        const box = obstacle.getHitbox();
        ctx.strokeRect(box.x, box.y, box.width, box.height);
      }
      ctx.strokeStyle = "#00C2FF";
      for (const coin of this.coins) {
        ctx.beginPath();
        ctx.arc(coin.x, coin.y, coin.radius, 0, Math.PI * 2);
        ctx.stroke();
      }
      /* Spawn line. */
      const spawnX = this.viewport.getSpawnX();
      ctx.strokeStyle = "#FFB000";
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.moveTo(spawnX, top);
      ctx.lineTo(spawnX, this.config.WORLD_HEIGHT);
      ctx.stroke();
      ctx.setLineDash([]);

      const info = this.spawnDirector.getDebugInfo();
      const lines = [
        "speed: " + Math.round(this.currentGameSpeed),
        "difficulty: " + this.getDifficulty().id,
        "next: " + info.nextType + " in " + info.nextIn,
        "gapTarget: " + info.gapTarget,
        "obstacles: " + this.obstacles.length + " coins: " + this.coins.length,
        "seed: " + (this.debugSeed === null ? "none" : this.debugSeed)
      ];
      ctx.font = "700 20px monospace";
      ctx.fillStyle = "rgba(31, 41, 55, 0.85)";
      let y = top + 130;
      for (const line of lines) {
        ctx.fillText(line, 16, y);
        y += 26;
      }
    }
  };
})();
