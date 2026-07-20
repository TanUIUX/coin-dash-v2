/* Coin Dash — coin.js
   Coin + CoinPatternFactory: coin đơn, hàng ngang, vòng cung, coin trên vật cản.
   Visual: vàng đậm + viền tối + highlight + sparkle — tách biệt màu mặt trời. */
(function () {
  "use strict";
  window.CoinDash = window.CoinDash || {};

  window.CoinDash.Coin = class Coin {
    constructor(id, x, y) {
      this.id = id;
      this.x = x;
      this.y = y;
      this.baseY = y;
      this.radius = 18;
      this.value = 1;
      this.collected = false;
      this.active = true;
      this.animationTime = Math.random() * Math.PI * 2;
    }

    update(deltaTime, gameSpeed) {
      this.animationTime += deltaTime;
      this.x -= gameSpeed * deltaTime;
      /* Dao động nhẹ theo trục Y (tối đa ~4px). */
      this.y = this.baseY + Math.sin(this.animationTime * 3) * 4;
      if (this.x + this.radius < -100) {
        this.active = false;
      }
    }

    render(ctx) {
      const scale = 1 + Math.sin(this.animationTime * 6) * 0.08;
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.scale(scale, 1);

      /* Thân coin: vàng đậm + viền tối dày (silhouette rõ, không lẫn mặt trời nhạt). */
      ctx.fillStyle = "#FFC93C";
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#B57E14";
      ctx.lineWidth = 4;
      ctx.stroke();

      /* Vành trong. */
      ctx.strokeStyle = "#D99A1F";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius - 6, 0, Math.PI * 2);
      ctx.stroke();

      /* Highlight cong phía trên trái. */
      ctx.strokeStyle = "rgba(255, 243, 201, 0.95)";
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(-2, -2, this.radius - 8, Math.PI * 1.05, Math.PI * 1.55);
      ctx.stroke();

      /* Sparkle nhỏ nhấp nháy theo chu kỳ. */
      const twinkle = (Math.sin(this.animationTime * 4.2) + 1) / 2;
      if (twinkle > 0.55) {
        const a = (twinkle - 0.55) / 0.45;
        ctx.fillStyle = "rgba(255, 255, 255, " + (a * 0.95).toFixed(3) + ")";
        const s = 3 + a * 2.5;
        ctx.beginPath();
        ctx.moveTo(6, -8 - s);
        ctx.lineTo(6 + s * 0.42, -8 - s * 0.42);
        ctx.lineTo(6 + s, -8);
        ctx.lineTo(6 + s * 0.42, -8 + s * 0.42);
        ctx.lineTo(6, -8 + s);
        ctx.lineTo(6 - s * 0.42, -8 + s * 0.42);
        ctx.lineTo(6 - s, -8);
        ctx.lineTo(6 - s * 0.42, -8 - s * 0.42);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
  };

  window.CoinDash.CoinPatternFactory = {
    nextId: 1,

    makeCoin: function (x, y) {
      const coin = new window.CoinDash.Coin(this.nextId, x, y);
      this.nextId += 1;
      return coin;
    },

    /* kind: "single" | "row" | "arc". Khoảng cách coin >= 44px.
       rng: hàm random tùy chọn (seeded trong debug); mặc định Math.random. */
    createPattern: function (kind, startX, config, rng) {
      const random = typeof rng === "function" ? rng : Math.random;
      const coins = [];
      const groundY = config.GROUND_Y;

      if (kind === "single") {
        coins.push(this.makeCoin(startX, groundY - 110));
        return coins;
      }

      if (kind === "row") {
        const count = 3 + Math.floor(random() * 4); /* 3–6 */
        const y = groundY - (90 + random() * 120);
        for (let i = 0; i < count; i += 1) {
          coins.push(this.makeCoin(startX + i * 52, y));
        }
        return coins;
      }

      /* arc: 5–8 coin theo vòng cung. */
      const count = 5 + Math.floor(random() * 4);
      const baseY = groundY - 100;
      const peak = 150 + random() * 80;
      for (let i = 0; i < count; i += 1) {
        const t = count > 1 ? i / (count - 1) : 0;
        const y = baseY - Math.sin(t * Math.PI) * peak;
        coins.push(this.makeCoin(startX + i * 56, y));
      }
      return coins;
    },

    /* Coin phía trên vật cản: cách đỉnh vật cản >= 38px. */
    createAboveObstacle: function (obstacle, config) {
      const coins = [];
      const y = obstacle.y - 38 - 18;
      if (y < 90) {
        return coins;
      }
      const centerX = obstacle.x + obstacle.width / 2;
      const xs = [centerX - 52, centerX, centerX + 52];
      for (const x of xs) {
        coins.push(this.makeCoin(x, y));
      }
      return coins;
    }
  };
})();
