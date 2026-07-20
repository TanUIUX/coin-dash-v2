/* Coin Dash — player.js
   Player: physics, nhảy/nhảy kép + coyote time, sát thương, hitbox, render Canvas.
   Visual: silhouette rõ (outline), tay + chân, màu theo nhân vật đang chọn. */
(function () {
  "use strict";
  window.CoinDash = window.CoinDash || {};

  /* Helper vẽ dùng chung cho player/obstacle/coin/background/preview. */
  window.CoinDash.Draw = window.CoinDash.Draw || {};

  window.CoinDash.Draw.roundRect = function (ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(x, y, width, height, r);
      return;
    }
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.arcTo(x + width, y, x + width, y + r, r);
    ctx.lineTo(x + width, y + height - r);
    ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
    ctx.lineTo(x + r, y + height);
    ctx.arcTo(x, y + height, x, y + height - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  };

  /* Renderer nhân vật dùng chung: gameplay + preview ở Character Select.
     ctx đã được translate tới tâm nhân vật. w×h: kích thước sprite. */
  window.CoinDash.Draw.character = function (ctx, w, h, colors, pose) {
    const Draw = window.CoinDash.Draw;
    const p = pose || {};
    const time = p.time || 0;
    const outline = "#27313F";

    /* Chân. */
    ctx.fillStyle = colors.trim;
    if (p.airborne) {
      Draw.roundRect(ctx, -20, h / 2 - 20, 14, 17, 6);
      ctx.fill();
      Draw.roundRect(ctx, 8, h / 2 - 25, 14, 17, 6);
      ctx.fill();
    } else {
      const swing = Math.sin(time * 16) * (p.idle ? 2.5 : 7);
      Draw.roundRect(ctx, -19 + swing * 0.6, h / 2 - 22, 14, 22, 6);
      ctx.fill();
      Draw.roundRect(ctx, 6 - swing * 0.6, h / 2 - 22, 14, 22, 6);
      ctx.fill();
    }

    /* Tay sau (sau thân). */
    const armSwing = p.airborne ? -6 : Math.sin(time * 16 + Math.PI) * (p.idle ? 2 : 6);
    ctx.fillStyle = colors.trim;
    Draw.roundRect(ctx, -w / 2 + 2, -6 + armSwing, 12, 24, 6);
    ctx.fill();

    /* Thân + outline. */
    ctx.fillStyle = colors.body;
    Draw.roundRect(ctx, -w / 2 + 6, -h / 2, w - 12, h - 18, 16);
    ctx.fill();
    ctx.strokeStyle = outline;
    ctx.lineWidth = 3;
    Draw.roundRect(ctx, -w / 2 + 6, -h / 2, w - 12, h - 18, 16);
    ctx.stroke();

    /* Băng đô trên đầu. */
    ctx.fillStyle = colors.trim;
    Draw.roundRect(ctx, -w / 2 + 6, -h / 2 + 8, w - 12, 9, 4);
    ctx.fill();

    /* Bụng sáng. */
    ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
    Draw.roundRect(ctx, -w / 2 + 14, -h / 2 + 30, w - 28, h - 58, 12);
    ctx.fill();

    /* Tay trước. */
    ctx.fillStyle = colors.body;
    Draw.roundRect(ctx, w / 2 - 16, -4 - armSwing, 12, 24, 6);
    ctx.fill();
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2;
    Draw.roundRect(ctx, w / 2 - 16, -4 - armSwing, 12, 24, 6);
    ctx.stroke();

    /* Mắt. */
    ctx.fillStyle = colors.face;
    ctx.beginPath();
    ctx.arc(10, -h / 2 + 26, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1F2937";
    ctx.beginPath();
    ctx.arc(13.5, -h / 2 + 26, 4.5, 0, Math.PI * 2);
    ctx.fill();
  };

  window.CoinDash.Player = class Player {
    constructor(config) {
      this.config = config;
      this.reset();
    }

    reset() {
      const c = this.config;
      this.x = c.PLAYER_START_X;
      this.width = c.PLAYER_WIDTH;
      this.height = c.PLAYER_HEIGHT;
      this.y = c.GROUND_Y - this.height;
      this.velocityY = 0;
      this.gravity = c.GRAVITY;
      this.firstJumpForce = c.FIRST_JUMP_FORCE;
      this.doubleJumpForce = c.DOUBLE_JUMP_FORCE;
      this.maxFallSpeed = c.MAX_FALL_SPEED;
      this.health = c.MAX_HEALTH;
      this.maxHealth = c.MAX_HEALTH;
      this.jumpCount = 0;
      this.maxJumpCount = c.MAX_JUMP_COUNT;
      this.isGrounded = true;
      this.isInvincible = false;
      this.invincibleTimer = 0;
      this.invincibleDuration = c.INVINCIBLE_DURATION;
      this.coyoteTimer = c.COYOTE_TIME;
      this.animationTime = 0;
    }

    /* Trả về "jump" | "double_jump" | null.
       Coyote time: vẫn được nhảy lần đầu trong ~80ms sau khi rời đất.
       Tối đa 2 lần nhảy — không bao giờ có triple jump. */
    jump() {
      if (this.isGrounded || (this.jumpCount === 0 && this.coyoteTimer > 0)) {
        this.velocityY = this.firstJumpForce;
        this.jumpCount = 1;
        this.isGrounded = false;
        this.coyoteTimer = 0;
        return "jump";
      }
      if (this.jumpCount < this.maxJumpCount) {
        this.velocityY = this.doubleJumpForce;
        /* Nhảy giữa không trung khi chưa nhảy lần nào (hết coyote):
           tính là dùng cả hai lần nhảy. */
      this.jumpCount = this.maxJumpCount;
        return "double_jump";
      }
      return null;
    }

    update(deltaTime) {
      this.animationTime += deltaTime;

      /* Trọng lực + giới hạn tốc độ rơi. */
      this.velocityY = Math.min(this.velocityY + this.gravity * deltaTime, this.maxFallSpeed);
      this.y += this.velocityY * deltaTime;

      const groundTop = this.config.GROUND_Y - this.height;
      if (this.y >= groundTop) {
        this.y = groundTop;
        this.velocityY = 0;
        this.isGrounded = true;
        this.jumpCount = 0;
        this.coyoteTimer = this.config.COYOTE_TIME;
      } else {
        this.isGrounded = false;
        if (this.coyoteTimer > 0) {
          this.coyoteTimer = Math.max(0, this.coyoteTimer - deltaTime);
        }
      }

      if (this.isInvincible) {
        this.invincibleTimer -= deltaTime;
        if (this.invincibleTimer <= 0) {
          this.isInvincible = false;
          this.invincibleTimer = 0;
        }
      }
    }

    /* Trừ máu; trả về true nếu sát thương được áp dụng. */
    takeDamage() {
      if (this.isInvincible) {
        return false;
      }
      this.health -= 1;
      this.isInvincible = true;
      this.invincibleTimer = this.invincibleDuration;
      return true;
    }

    /* Hitbox nhỏ hơn sprite để va chạm công bằng. */
    getHitbox() {
      return {
        x: this.x + 8,
        y: this.y + 6,
        width: this.width - 16,
        height: this.height - 10
      };
    }

    render(ctx, character, reducedMotion) {
      const colors = character && character.colors
        ? character.colors
        : { body: "#2783DE", trim: "#1B5FA8", face: "#FFFFFF" };

      /* Nhấp nháy khi bất tử (reduced motion: mờ thay vì nhấp nháy nhanh). */
      let alpha = 1;
      if (this.isInvincible) {
        if (reducedMotion) {
          alpha = 0.5;
        } else {
          const visible = Math.floor(this.invincibleTimer * 12) % 2 === 0;
          if (!visible) {
            return;
          }
        }
      }

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
      if (!this.isGrounded) {
        ctx.rotate(this.velocityY < 0 ? -0.12 : 0.1);
      }
      window.CoinDash.Draw.character(ctx, this.width, this.height, colors, {
        time: this.animationTime,
        airborne: !this.isGrounded,
        idle: false
      });
      ctx.restore();
    }
  };
})();
