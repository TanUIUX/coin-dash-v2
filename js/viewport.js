/* Coin Dash — viewport.js
   ViewportManager: camera thích ứng theo kích thước stage.
   - Physics luôn dùng world units (720 world height cố định).
   - visibleWorldWidth = 720 × stageAspectRatio, clamp 500–1280.
   - Ground luôn neo ở đáy vùng nhìn thấy; không kéo méo hình.
   - Hỗ trợ devicePixelRatio (tối đa 2). Resize không reset game. */
(function () {
  "use strict";
  window.CoinDash = window.CoinDash || {};

  window.CoinDash.ViewportManager = class ViewportManager {
    constructor(canvas, stage, config) {
      this.canvas = canvas;
      this.stage = stage;
      this.config = config;
      this.dpr = 1;
      this.scale = 1;
      this.visibleWorldWidth = config.WORLD_WIDTH;
      this.visibleWorldHeight = config.WORLD_HEIGHT;
      this.worldTop = 0;
      this.resize();
    }

    /* Gọi khi khởi tạo + mỗi lần window resize/orientationchange. */
    resize() {
      const rect = this.stage.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) {
        return;
      }
      const v = this.config.VIEWPORT;
      this.dpr = Math.min(window.devicePixelRatio || 1, v.MAX_DPR);

      const pixelWidth = Math.max(1, Math.round(rect.width * this.dpr));
      const pixelHeight = Math.max(1, Math.round(rect.height * this.dpr));
      if (this.canvas.width !== pixelWidth) {
        this.canvas.width = pixelWidth;
      }
      if (this.canvas.height !== pixelHeight) {
        this.canvas.height = pixelHeight;
      }

      const aspect = rect.width / rect.height;
      this.visibleWorldWidth = Math.max(
        v.MIN_VISIBLE_WORLD_WIDTH,
        Math.min(v.MAX_VISIBLE_WORLD_WIDTH, this.config.WORLD_HEIGHT * aspect)
      );
      /* Scale đồng nhất 2 trục (không méo). */
      this.scale = pixelWidth / this.visibleWorldWidth;
      this.visibleWorldHeight = pixelHeight / this.scale;
      /* Neo mặt đất ở đáy: vùng world nhìn thấy theo trục Y là
         [worldTop, worldTop + visibleWorldHeight] với đáy = WORLD_HEIGHT. */
      this.worldTop = this.config.WORLD_HEIGHT - this.visibleWorldHeight;
    }

    /* Áp transform world -> pixel cho một frame render. */
    apply(ctx) {
      ctx.setTransform(this.scale, 0, 0, this.scale, 0, -this.worldTop * this.scale);
    }

    clear(ctx) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /* Vị trí sinh vật thể: ngay ngoài mép phải vùng nhìn thấy. */
    getSpawnX() {
      return this.visibleWorldWidth + this.config.VIEWPORT.SPAWN_MARGIN;
    }

    /* Player đứng ở ~22% chiều rộng vùng nhìn thấy. */
    getPlayerX() {
      return Math.round(this.visibleWorldWidth * this.config.VIEWPORT.PLAYER_VIEW_X_RATIO);
    }
  };
})();
