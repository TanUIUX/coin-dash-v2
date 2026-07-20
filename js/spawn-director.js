/* Coin Dash — spawn-director.js
   SpawnDirector: điều phối sinh vật cản + coin theo vùng nhìn thấy hiện tại.
   Công bằng: khoảng cách tối thiểu tính theo reaction time + thời gian bay của cú nhảy,
   quy tắc cặp loại (PAIR_MIN_GAPS), không bao giờ đòi nhảy lần ba.
   Debug: hỗ trợ seeded random để tái hiện lỗi (?debug=1&seed=123). */
(function () {
  "use strict";
  window.CoinDash = window.CoinDash || {};

  /* mulberry32: PRNG nhỏ gọn, đủ tốt cho debug tái hiện. */
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  window.CoinDash.SpawnDirector = class SpawnDirector {
    constructor(config) {
      this.config = config;
      /* Thời gian bay của cú nhảy đơn (lên + xuống), tính từ physics thật. */
      this.jumpAirTime = (2 * Math.abs(config.FIRST_JUMP_FORCE)) / config.GRAVITY;
      this.reactionTimeBudget = 0.3; /* giây người chơi cần để phản ứng */
      this.reset({ seed: null, tutorialActive: false });
    }

    reset(options) {
      const opts = options || {};
      this.random = typeof opts.seed === "number" ? mulberry32(opts.seed) : Math.random;
      this.tutorialActive = !!opts.tutorialActive;
      this.firstObstacleSpawned = false;
      this.distanceSinceLastObstacle = 0;
      this.nextObstacleDistance = 0;
      this.nextObstacleType = "low_crate";
      this.lastObstacleType = null;
      this.distanceSinceLastCoin = 0;
      this.nextCoinDistance = 360;
    }

    /* Chuẩn bị lượt mới: quyết định trước loại + khoảng cách đầu tiên. */
    prepareRun(difficulty, speed) {
      this.nextObstacleType = window.CoinDash.ObstacleFactory.rollType2(difficulty.weights, this.random);
      this.nextObstacleDistance = this.rollGap(difficulty, speed);
      if (this.tutorialActive) {
        /* Vật cản đầu tiên của người mới: gap lớn hơn + luôn là thùng thấp. */
        this.nextObstacleType = "low_crate";
        this.nextObstacleDistance += this.config.TUTORIAL.FIRST_OBSTACLE_EXTRA_GAP;
      }
    }

    /* Gap tối thiểu an toàn: quãng đường thế giới trôi qua trong
       (thời gian bay × 0.8 + reaction time). Đảm bảo giữa hai vật cản
       luôn đáp đất được và còn thời gian phản ứng — không bao giờ cần cú nhảy thứ ba. */
    fairMinimumGap(speed) {
      return speed * (this.jumpAirTime * 0.8 + this.reactionTimeBudget);
    }

    rollGap(difficulty, speed) {
      const range = difficulty.gap;
      const rolled = range[0] + this.random() * (range[1] - range[0]);
      return Math.max(rolled, this.fairMinimumGap(speed));
    }

    /* Gọi mỗi frame khi PLAYING. game: tham chiếu Game (obstacles, coins, viewport…). */
    update(game, travel) {
      this.distanceSinceLastObstacle += travel;
      this.distanceSinceLastCoin += travel;

      if (game.elapsedTime >= this.config.SAFE_START_TIME) {
        if (
          this.distanceSinceLastObstacle >= this.nextObstacleDistance &&
          game.obstacles.length < this.config.MAX_OBSTACLES
        ) {
          this.spawnObstacle(game);
        }
      }
      if (
        this.distanceSinceLastCoin >= this.nextCoinDistance &&
        game.coins.length < this.config.MAX_COINS - 8
      ) {
        this.spawnCoinPattern(game);
      }
    }

    spawnObstacle(game) {
      const factory = window.CoinDash.ObstacleFactory;
      const type = this.nextObstacleType;
      const spawnX = game.viewport.getSpawnX();
      const obstacle = factory.create(type, spawnX, this.config);
      game.obstacles.push(obstacle);
      if (!this.firstObstacleSpawned) {
        this.firstObstacleSpawned = true;
        obstacle.isTutorialObstacle = this.tutorialActive;
      }

      /* 35% cơ hội đặt coin phía trên vật cản đứng yên. */
      if (type !== "moving_drone" && this.random() < 0.35) {
        const bonus = window.CoinDash.CoinPatternFactory.createAboveObstacle(obstacle, this.config);
        for (const coin of bonus) {
          if (game.coins.length < this.config.MAX_COINS) {
            game.coins.push(coin);
          }
        }
      }

      /* Quyết định trước loại + khoảng cách cho vật cản kế tiếp:
         gap ngẫu nhiên theo độ khó, nhưng không nhỏ hơn gap công bằng theo tốc độ
         hiện tại và quy tắc cặp loại. */
      this.lastObstacleType = type;
      this.nextObstacleType = factory.rollType2(game.getDifficulty().weights, this.random);
      const fairnessGap = factory.pairMinimumGap(type, this.nextObstacleType, this.config);
      this.nextObstacleDistance = Math.max(
        this.rollGap(game.getDifficulty(), game.currentGameSpeed),
        fairnessGap
      );
      this.distanceSinceLastObstacle = 0;
    }

    spawnCoinPattern(game) {
      const factory = window.CoinDash.CoinPatternFactory;
      const kinds = ["single", "row", "arc"];
      const kind = kinds[Math.floor(this.random() * kinds.length)];
      const startX = game.viewport.getSpawnX() + 40;
      const candidates = factory.createPattern(kind, startX, this.config, this.random);

      /* Không cho coin dẫn người chơi vào hitbox:
         (1) vật cản đang tồn tại, nới rộng 40px;
         (2) vị trí dự đoán của vật cản KẾ TIẾP (cùng tốc độ với coin nên
             khoảng cách tương đối không đổi), nới rộng 60px. */
      const collision = window.CoinDash.Collision;
      const blockers = [];
      for (const obstacle of game.obstacles) {
        blockers.push({
          x: obstacle.x - 40,
          y: Math.min(obstacle.y, obstacle.baseY - (obstacle.moveAmplitude || 0)) - 40,
          width: obstacle.width + 80,
          height: obstacle.height + (obstacle.moveAmplitude || 0) * 2 + 80
        });
      }
      const nextSpec = this.config.OBSTACLE_TYPES[this.nextObstacleType];
      if (nextSpec) {
        const predictedX = game.viewport.getSpawnX() +
          (this.nextObstacleDistance - this.distanceSinceLastObstacle);
        const predictedY = this.nextObstacleType === "moving_drone"
          ? this.config.GROUND_Y - nextSpec.baseYFromGround - nextSpec.amplitude
          : this.config.GROUND_Y - nextSpec.height;
        blockers.push({
          x: predictedX - 60,
          y: predictedY - 60,
          width: nextSpec.width + 120,
          height: nextSpec.height + (nextSpec.amplitude ? nextSpec.amplitude * 2 : 0) + 120
        });
      }

      const safe = candidates.filter(function (coin) {
        for (const rect of blockers) {
          if (collision.circleIntersectsRectangle({ x: coin.x, y: coin.baseY, radius: coin.radius }, rect)) {
            return false;
          }
        }
        return true;
      });
      for (const coin of safe) {
        if (game.coins.length < this.config.MAX_COINS) {
          game.coins.push(coin);
        }
      }
      this.nextCoinDistance = 420 + this.random() * 360;
      this.distanceSinceLastCoin = 0;
    }

    /* Thông tin cho debug overlay. */
    getDebugInfo() {
      return {
        nextType: this.nextObstacleType,
        nextIn: Math.round(this.nextObstacleDistance - this.distanceSinceLastObstacle),
        gapTarget: Math.round(this.nextObstacleDistance),
        lastType: this.lastObstacleType
      };
    }
  };
})();
