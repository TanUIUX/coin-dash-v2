/* Coin Dash — config.js
   Toàn bộ hằng số: world, physics, tốc độ, độ khó, nhân vật, nhiệm vụ, màu sắc. */
(function () {
  "use strict";
  window.CoinDash = window.CoinDash || {};

  window.CoinDash.GAME_STATES = {
    LOADING: "LOADING",
    HOME: "HOME",
    HOW_TO_PLAY: "HOW_TO_PLAY",
    CHARACTER_SELECT: "CHARACTER_SELECT",
    MISSIONS: "MISSIONS",
    SETTINGS: "SETTINGS",
    PLAYING: "PLAYING",
    PAUSED: "PAUSED",
    GAME_OVER: "GAME_OVER"
  };

  window.CoinDash.VALID_TRANSITIONS = {
    LOADING: ["HOME"],
    HOME: ["PLAYING", "HOW_TO_PLAY", "CHARACTER_SELECT", "MISSIONS", "SETTINGS"],
    HOW_TO_PLAY: ["HOME"],
    CHARACTER_SELECT: ["HOME"],
    MISSIONS: ["HOME"],
    SETTINGS: ["HOME"],
    PLAYING: ["PAUSED", "GAME_OVER"],
    PAUSED: ["PLAYING", "HOME"],
    GAME_OVER: ["PLAYING", "HOME"]
  };

  window.CoinDash.CONFIG = {
    /* World (world units — physics luôn dùng đơn vị này) */
    WORLD_WIDTH: 1280,
    WORLD_HEIGHT: 720,
    GROUND_Y: 620,

    /* Viewport thích ứng (xem viewport.js) */
    VIEWPORT: {
      MIN_VISIBLE_WORLD_WIDTH: 500,
      MAX_VISIBLE_WORLD_WIDTH: 1280,
      PLAYER_VIEW_X_RATIO: 0.22,
      SPAWN_MARGIN: 80,
      MAX_DPR: 2
    },

    /* Player */
    PLAYER_START_X: 180,
    PLAYER_WIDTH: 64,
    PLAYER_HEIGHT: 80,
    GRAVITY: 2600,
    FIRST_JUMP_FORCE: -950,
    DOUBLE_JUMP_FORCE: -850,
    MAX_FALL_SPEED: 1800,
    MAX_JUMP_COUNT: 2,
    MAX_HEALTH: 3,
    INVINCIBLE_DURATION: 1.5,

    /* Điều khiển nâng cao */
    JUMP_BUFFER_TIME: 0.1,
    COYOTE_TIME: 0.08,

    /* Speed & difficulty */
    BASE_GAME_SPEED: 420,
    MAX_GAME_SPEED: 950,
    SPEED_INCREASE_PER_SECOND: 4.5,
    SAFE_START_TIME: 2.5,

    /* Object limits */
    MAX_OBSTACLES: 20,
    MAX_COINS: 60,
    MAX_EFFECTS: 30,
    MAX_PARTICLES: 90,

    /* Scoring */
    SCORE_PER_SECOND: 10,
    SCORE_PER_COIN: 5,

    /* Effects */
    SHAKE_DURATION: 0.16,
    SHAKE_MAGNITUDE: 6,
    HIT_STOP_DURATION: 0.05,

    /* Tutorial lượt chơi đầu */
    TUTORIAL: {
      FIRST_OBSTACLE_EXTRA_GAP: 320,
      FIRST_OBSTACLE_SPEED_FACTOR: 0.82
    },

    /* Persistence */
    STORAGE_KEY: "coinDashSave",
    SAVE_VERSION: 2,

    /* Palette (đồng bộ với design tokens trong style.css) */
    COLORS: {
      primary: "#6C5CE7",
      secondary: "#00B894",
      coin: "#FFC93C",
      coinDark: "#D99A1F",
      coinShine: "#FFF3C9",
      danger: "#E17055",
      sky: "#DFF4FF",
      skyTop: "#BDE3FF",
      sun: "#FFF2D0",
      sunCore: "#FFE7A8",
      ground: "#55B86A",
      groundDark: "#46A171",
      outline: "#27313F",
      text: "#1F2937",
      surface: "#FFFFFF"
    },

    /* Difficulty tiers (minTime in seconds) */
    DIFFICULTIES: [
      {
        id: "easy",
        label: "Easy",
        minTime: 0,
        gap: [700, 950],
        weights: { low_crate: 0.8, tall_pillar: 0.2, moving_drone: 0 }
      },
      {
        id: "normal",
        label: "Normal",
        minTime: 30,
        gap: [620, 850],
        weights: { low_crate: 0.6, tall_pillar: 0.4, moving_drone: 0 }
      },
      {
        id: "hard",
        label: "Hard",
        minTime: 60,
        gap: [560, 780],
        weights: { low_crate: 0.45, tall_pillar: 0.35, moving_drone: 0.2 }
      },
      {
        id: "extreme",
        label: "Extreme",
        minTime: 90,
        gap: [500, 720],
        weights: { low_crate: 0.35, tall_pillar: 0.35, moving_drone: 0.3 }
      }
    ],

    /* Obstacle specs */
    OBSTACLE_TYPES: {
      low_crate: { width: 72, height: 64, damage: 1 },
      tall_pillar: { width: 64, height: 118, damage: 1 },
      moving_drone: {
        width: 88,
        height: 56,
        damage: 1,
        movementType: "vertical",
        amplitude: 55,
        frequency: 2.1,
        baseYFromGround: 260
      }
    },

    /* Fairness rules: minimum gap (px) required between obstacle pairs */
    PAIR_MIN_GAPS: {
      "tall_pillar>tall_pillar": 650,
      "moving_drone>tall_pillar": 720,
      "tall_pillar>moving_drone": 720,
      "moving_drone>any": 700
    },

    /* Characters (visual differences only — same gameplay stats) */
    CHARACTERS: [
      {
        id: "runner-blue",
        name: "Blue Runner",
        price: 0,
        unlockedByDefault: true,
        colors: { body: "#2783DE", trim: "#1B5FA8", face: "#FFFFFF" }
      },
      {
        id: "runner-pink",
        name: "Pink Runner",
        price: 200,
        unlockedByDefault: false,
        colors: { body: "#DF84A8", trim: "#B85E85", face: "#FFFFFF" }
      },
      {
        id: "runner-ninja",
        name: "Ninja Runner",
        price: 500,
        unlockedByDefault: false,
        colors: { body: "#3A3A38", trim: "#E56458", face: "#F0EFED" }
      }
    ],

    /* One-time missions */
    MISSIONS: [
      {
        id: "collect-20-coins",
        title: "Thợ săn coin",
        description: "Thu thập 20 coin trong một lượt",
        type: "run_coins",
        target: 20,
        unit: "coin",
        reward: 50
      },
      {
        id: "score-500",
        title: "Người chạy tài năng",
        description: "Đạt 500 điểm trong một lượt",
        type: "run_score",
        target: 500,
        unit: "điểm",
        reward: 100
      },
      {
        id: "survive-60",
        title: "Bền bỉ",
        description: "Sống sót 60 giây trong một lượt",
        type: "survival_time",
        target: 60,
        unit: "giây",
        reward: 150
      }
    ]
  };
})();
