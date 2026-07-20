/* Coin Dash — missions.js
   MissionManager: nhiệm vụ một lần + bestProgress bền vững giữa các lượt chơi.
   Không cộng thưởng hai lần; progress chỉ tăng, không giảm. */
(function () {
  "use strict";
  window.CoinDash = window.CoinDash || {};

  window.CoinDash.MissionManager = class MissionManager {
    constructor(missionDefs, savedProgress) {
      const saved = savedProgress && typeof savedProgress === "object" ? savedProgress : {};
      this.missions = missionDefs.map(function (def) {
        const entry = saved[def.id] || {};
        const completed = entry.completed === true;
        let best = Number(entry.bestProgress);
        if (!Number.isFinite(best) || best < 0) {
          best = 0;
        }
        if (completed) {
          best = def.target;
        }
        return {
          id: def.id,
          title: def.title,
          description: def.description,
          type: def.type,
          target: def.target,
          unit: def.unit || "",
          reward: def.reward,
          bestProgress: Math.min(best, def.target),
          completed: completed,
          rewardClaimed: entry.rewardClaimed === true
        };
      });
    }

    getMissions() {
      return this.missions;
    }

    /* Nhiệm vụ nổi bật: nhiệm vụ chưa hoàn thành đầu tiên (ưu tiên gần xong nhất);
       nếu tất cả đã xong, trả về null. */
    getFeatured() {
      let featured = null;
      let bestRatio = -1;
      for (const mission of this.missions) {
        if (mission.completed) {
          continue;
        }
        const ratio = mission.target > 0 ? mission.bestProgress / mission.target : 0;
        if (ratio > bestRatio) {
          bestRatio = ratio;
          featured = mission;
        }
      }
      return featured;
    }

    valueFor(mission, runStats) {
      if (mission.type === "run_coins") {
        return Math.floor(runStats.runCoins || 0);
      }
      if (mission.type === "run_score") {
        return Math.floor(runStats.score || 0);
      }
      if (mission.type === "survival_time") {
        return Math.floor(runStats.elapsedTime || 0);
      }
      return 0;
    }

    /* Cập nhật bestProgress trong bộ nhớ (gọi trong lúc chơi, không ghi LocalStorage). */
    updateProgress(runStats) {
      let changed = false;
      for (const mission of this.missions) {
        const value = Math.min(this.valueFor(mission, runStats), mission.target);
        if (value > mission.bestProgress) {
          mission.bestProgress = value;
          changed = true;
        }
      }
      return changed;
    }

    /* runStats: { runCoins, score, elapsedTime }.
       Trả về danh sách nhiệm vụ vừa hoàn thành (mỗi nhiệm vụ chỉ trả về đúng một lần). */
    check(runStats) {
      this.updateProgress(runStats);
      const completedNow = [];
      for (const mission of this.missions) {
        if (mission.completed) {
          continue;
        }
        if (this.valueFor(mission, runStats) >= mission.target) {
          mission.completed = true;
          mission.bestProgress = mission.target;
          if (!mission.rewardClaimed) {
            mission.rewardClaimed = true;
            completedNow.push(mission);
          }
        }
      }
      return completedNow;
    }

    /* Xuất dữ liệu để lưu vào LocalStorage (schema v2: missionProgress). */
    serialize() {
      const out = {};
      for (const mission of this.missions) {
        out[mission.id] = {
          bestProgress: mission.bestProgress,
          completed: mission.completed,
          rewardClaimed: mission.rewardClaimed
        };
      }
      return out;
    }
  };
})();
