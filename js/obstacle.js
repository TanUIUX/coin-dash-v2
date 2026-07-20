/* Coin Dash — obstacle.js
   Obstacle + ObstacleFactory: 3 loại vật cản, di chuyển, hitbox, quy tắc công bằng. */
(function () {
  "use strict";
  window.CoinDash = window.CoinDash || {};

  window.CoinDash.Obstacle = class Obstacle {
    constructor(options) {
      this.id = options.id;
      this.type = options.type;
      this.x = options.x;
      this.y = options.y;
      this.width = options.width;
      this.height = options.height;
      this.speedMultiplier = options.speedMultiplier || 1;
      this.damage = options.damage || 1;
      this.active = true;
      this.hasHitPlayer = false;
      this.animationTime = Math.random() * Math.PI * 2;
      this.baseY = typeof options.baseY === "number" ? options.baseY : options.y;
      this.moveAmplitude = options.moveAmplitude || 0;
      this.moveFrequency = options.moveFrequency || 0;
    }

    update(deltaTime, gameSpeed) {
      this.animationTime += deltaTime;
      this.x -= gameSpeed * this.speedMultiplier * deltaTime;
      if (this.type === "moving_drone") {
        this.y = this.baseY + Math.sin(this.animationTime * this.moveFrequency) * this.moveAmplitude;
      }
      if (this.x + this.width < -100) {
        this.active = false;
      }
    }

    /* Hitbox nhỏ hơn hình vẽ 4px mỗi cạnh. */
    getHitbox() {
      return {
        x: this.x + 4,
        y: this.y + 4,
        width: this.width - 8,
        height: this.height - 8
      };
    }

    render(ctx) {
      const Draw = window.CoinDash.Draw;
      if (this.type === "low_crate") {
        ctx.fillStyle = "#C98A4B";
        Draw.roundRect(ctx, this.x, this.y, this.width, this.height, 8);
        ctx.fill();
        ctx.strokeStyle = "#A96B31";
        ctx.lineWidth = 4;
        Draw.roundRect(ctx, this.x + 4, this.y + 4, this.width - 8, this.height - 8, 6);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(this.x + 6, this.y + 6);
        ctx.lineTo(this.x + this.width - 6, this.y + this.height - 6);
        ctx.moveTo(this.x + this.width - 6, this.y + 6);
        ctx.lineTo(this.x + 6, this.y + this.height - 6);
        ctx.stroke();
        return;
      }

      if (this.type === "tall_pillar") {
        ctx.fillStyle = "#8A93A6";
        Draw.roundRect(ctx, this.x, this.y + 8, this.width, this.height - 8, 6);
        ctx.fill();
        ctx.fillStyle = "#6E7789";
        Draw.roundRect(ctx, this.x - 5, this.y, this.width + 10, 16, 5);
        ctx.fill();
        ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
        ctx.fillRect(this.x + 8, this.y + 20, 10, this.height - 32);
        return;
      }

      /* moving_drone */
      ctx.save();
      ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
      /* Cánh quạt. */
      const spin = Math.sin(this.animationTime * 30) * (this.width / 2 - 6);
      ctx.strokeStyle = "#9AA3B5";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-spin, -this.height / 2 + 2);
      ctx.lineTo(spin, -this.height / 2 + 2);
      ctx.stroke();
      /* Thân drone. */
      ctx.fillStyle = "#4A5468";
      window.CoinDash.Draw.roundRect(ctx, -this.width / 2, -this.height / 2 + 8, this.width, this.height - 8, 14);
      ctx.fill();
      /* Mắt cảm biến. */
      ctx.fillStyle = "#E17055";
      ctx.beginPath();
      ctx.arc(0, 6, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.beginPath();
      ctx.arc(-3, 3, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  };

  window.CoinDash.ObstacleFactory = {
    nextId: 1,

    create: function (type, x, config) {
      const spec = config.OBSTACLE_TYPES[type] || config.OBSTACLE_TYPES.low_crate;
      const options = {
        id: this.nextId,
        type: type,
        x: x,
        width: spec.width,
        height: spec.height,
        damage: spec.damage,
        speedMultiplier: 1
      };
      this.nextId += 1;
      if (type === "moving_drone") {
        options.baseY = config.GROUND_Y - spec.baseYFromGround;
        options.y = options.baseY;
        options.moveAmplitude = spec.amplitude;
        options.moveFrequency = spec.frequency;
      } else {
        options.y = config.GROUND_Y - spec.height;
      }
      return new window.CoinDash.Obstacle(options);
    },

    /* Chọn loại vật cản theo tỷ lệ của độ khó. */
    /* Bản seeded: dùng rng truyền vào (debug tái hiện lỗi). */
    rollType2: function (weights, rng) {
      const roll = (typeof rng === "function" ? rng() : Math.random());
      let acc = 0;
      for (const key of Object.keys(weights)) {
        acc += weights[key];
        if (roll < acc) {
          return key;
        }
      }
      return "low_crate";
    },

    rollType: function (weights) {
      const roll = Math.random();
      let acc = 0;
      for (const key of Object.keys(weights)) {
        acc += weights[key];
        if (roll < acc) {
          return key;
        }
      }
      return "low_crate";
    },

    /* Khoảng cách tối thiểu bắt buộc giữa hai loại vật cản liên tiếp (quy tắc công bằng). */
    pairMinimumGap: function (previousType, nextType, config) {
      const rules = config.PAIR_MIN_GAPS;
      let minGap = 0;
      if (rules[previousType + ">" + nextType]) {
        minGap = Math.max(minGap, rules[previousType + ">" + nextType]);
      }
      if (rules[previousType + ">any"]) {
        minGap = Math.max(minGap, rules[previousType + ">any"]);
      }
      return minGap;
    }
  };
})();
