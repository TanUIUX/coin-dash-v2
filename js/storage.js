/* Coin Dash — storage.js
   StorageManager: default data (schema v2), load, validate, migrate, save, reset.
   Migration: v0 (thiếu version) -> v1 -> v2. Không mất dữ liệu, không cộng lại reward. */
(function () {
  "use strict";
  window.CoinDash = window.CoinDash || {};

  window.CoinDash.StorageManager = class StorageManager {
    constructor(config) {
      this.config = config;
      this.key = config.STORAGE_KEY;
    }

    getDefaultData() {
      const missionProgress = {};
      for (const mission of this.config.MISSIONS) {
        missionProgress[mission.id] = {
          bestProgress: 0,
          completed: false,
          rewardClaimed: false
        };
      }
      const unlockedCharacters = this.config.CHARACTERS
        .filter(function (character) { return character.unlockedByDefault; })
        .map(function (character) { return character.id; });
      return {
        version: this.config.SAVE_VERSION,
        highScore: 0,
        bestTime: 0,
        totalRuns: 0,
        totalCoins: 0,
        selectedCharacter: unlockedCharacters[0] || "runner-blue",
        unlockedCharacters: unlockedCharacters,
        soundEnabled: true,
        musicEnabled: true,
        screenShakeEnabled: true,
        reducedMotionEnabled: false,
        tutorialCompleted: false,
        missionProgress: missionProgress
      };
    }

    load() {
      let raw = null;
      try {
        raw = window.localStorage.getItem(this.key);
      } catch (error) {
        console.warn("CoinDash: LocalStorage bị chặn, dùng dữ liệu mặc định.", error);
        return this.getDefaultData();
      }
      if (!raw) {
        return this.getDefaultData();
      }
      try {
        const parsed = JSON.parse(raw);
        return this.validate(this.migrate(parsed));
      } catch (error) {
        console.warn("CoinDash: Dữ liệu save lỗi, dùng dữ liệu mặc định.", error);
        return this.getDefaultData();
      }
    }

    migrate(data) {
      if (!data || typeof data !== "object" || Array.isArray(data)) {
        return this.getDefaultData();
      }
      let migrated = Object.assign({}, data);

      /* Thiếu version => coi như version 0. */
      if (typeof migrated.version !== "number" || !Number.isFinite(migrated.version)) {
        migrated.version = 0;
      }

      /* v0/v1 -> v2: chuyển completedMissions thành missionProgress,
         giữ nguyên completed/rewardClaimed để không cộng lại thưởng. */
      if (migrated.version < 2) {
        const legacy = (migrated.completedMissions && typeof migrated.completedMissions === "object")
          ? migrated.completedMissions
          : (migrated.missionProgress && typeof migrated.missionProgress === "object" ? migrated.missionProgress : {});
        const missionProgress = {};
        for (const mission of this.config.MISSIONS) {
          const entry = legacy[mission.id] || {};
          const completed = entry.completed === true;
          missionProgress[mission.id] = {
            /* v1 không lưu progress: nhiệm vụ đã xong coi như đạt target. */
            bestProgress: this.toSafeCount(entry.bestProgress) || (completed ? mission.target : 0),
            completed: completed,
            rewardClaimed: entry.rewardClaimed === true
          };
        }
        migrated = Object.assign({}, this.getDefaultData(), migrated, {
          version: this.config.SAVE_VERSION,
          missionProgress: missionProgress
        });
        delete migrated.completedMissions;
      }

      /* Version tương lai: giữ các trường đọc được, không crash. */
      if (migrated.version > this.config.SAVE_VERSION) {
        migrated = Object.assign({}, migrated, { version: this.config.SAVE_VERSION });
      }
      return migrated;
    }

    validate(data) {
      const defaults = this.getDefaultData();
      const source = data && typeof data === "object" ? data : {};
      const out = Object.assign({}, defaults, source);

      out.version = this.config.SAVE_VERSION;
      out.highScore = this.toSafeCount(out.highScore);
      out.bestTime = this.toSafeCount(out.bestTime);
      out.totalRuns = this.toSafeCount(out.totalRuns);
      out.totalCoins = this.toSafeCount(out.totalCoins);
      out.soundEnabled = typeof out.soundEnabled === "boolean" ? out.soundEnabled : true;
      out.musicEnabled = typeof out.musicEnabled === "boolean" ? out.musicEnabled : true;
      out.screenShakeEnabled = typeof out.screenShakeEnabled === "boolean" ? out.screenShakeEnabled : true;
      out.reducedMotionEnabled = typeof out.reducedMotionEnabled === "boolean" ? out.reducedMotionEnabled : false;
      out.tutorialCompleted = out.tutorialCompleted === true;

      /* Chỉ giữ ID nhân vật hợp lệ + luôn mở khóa nhân vật mặc định. */
      const knownIds = this.config.CHARACTERS.map(function (character) { return character.id; });
      const unlocked = Array.isArray(out.unlockedCharacters) ? out.unlockedCharacters : [];
      out.unlockedCharacters = unlocked.filter(function (id) {
        return knownIds.indexOf(id) !== -1;
      });
      for (const character of this.config.CHARACTERS) {
        if (character.unlockedByDefault && out.unlockedCharacters.indexOf(character.id) === -1) {
          out.unlockedCharacters.push(character.id);
        }
      }

      /* selectedCharacter phải nằm trong danh sách đã mở khóa. */
      if (out.unlockedCharacters.indexOf(out.selectedCharacter) === -1) {
        out.selectedCharacter = defaults.selectedCharacter;
      }

      /* Chuẩn hóa missionProgress theo danh sách trong config. */
      const savedMissions = out.missionProgress && typeof out.missionProgress === "object"
        ? out.missionProgress
        : {};
      const cleanMissions = {};
      for (const mission of this.config.MISSIONS) {
        const entry = savedMissions[mission.id];
        const completed = !!(entry && entry.completed === true);
        cleanMissions[mission.id] = {
          bestProgress: Math.min(
            this.toSafeCount(entry ? entry.bestProgress : 0) || (completed ? mission.target : 0),
            mission.target
          ),
          completed: completed,
          rewardClaimed: !!(entry && entry.rewardClaimed === true)
        };
      }
      out.missionProgress = cleanMissions;

      return out;
    }

    toSafeCount(value) {
      const parsed = Number(value);
      if (!Number.isFinite(parsed) || parsed < 0) {
        return 0;
      }
      return Math.floor(parsed);
    }

    save(data) {
      try {
        window.localStorage.setItem(this.key, JSON.stringify(data));
      } catch (error) {
        console.warn("CoinDash: Không thể lưu dữ liệu.", error);
      }
    }

    reset() {
      try {
        window.localStorage.removeItem(this.key);
      } catch (error) {
        console.warn("CoinDash: Không thể xóa dữ liệu.", error);
      }
      return this.getDefaultData();
    }
  };
})();
