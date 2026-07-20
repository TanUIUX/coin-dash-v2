/* Coin Dash — particles.js
   ParticleSystem: hiệu ứng nhẹ (burst khi ăn coin, ring khi nhảy kép, bụi va chạm).
   Có giới hạn số lượng + tôn trọng reduced motion (giảm mạnh particle). */
(function () {
  "use strict";
  window.CoinDash = window.CoinDash || {};

  window.CoinDash.ParticleSystem = class ParticleSystem {
    constructor(maxParticles) {
      this.max = maxParticles || 90;
      this.particles = [];
      this.reducedMotion = false;
    }

    setReducedMotion(value) {
      this.reducedMotion = !!value;
    }

    clear() {
      this.particles.length = 0;
    }

    push(particle) {
      if (this.particles.length >= this.max) {
        this.particles.shift();
      }
      this.particles.push(particle);
    }

    /* Burst tròn (ăn coin, va chạm). */
    burst(x, y, options) {
      const opts = options || {};
      let count = opts.count || 8;
      if (this.reducedMotion) {
        count = Math.max(2, Math.floor(count / 3));
      }
      const colors = opts.colors || ["#FFC93C", "#FFF3C9"];
      const speed = opts.speed || 240;
      for (let i = 0; i < count; i += 1) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.6;
        const velocity = speed * (0.5 + Math.random() * 0.7);
        this.push({
          kind: "dot",
          x: x,
          y: y,
          vx: Math.cos(angle) * velocity,
          vy: Math.sin(angle) * velocity - 60,
          size: (opts.size || 5) * (0.7 + Math.random() * 0.6),
          color: colors[i % colors.length],
          age: 0,
          life: opts.life || 0.45,
          gravity: typeof opts.gravity === "number" ? opts.gravity : 620
        });
      }
    }

    /* Ring mở rộng (nhảy kép). */
    ring(x, y, color) {
      this.push({
        kind: "ring",
        x: x,
        y: y,
        radius: 10,
        maxRadius: this.reducedMotion ? 26 : 48,
        color: color || "rgba(255, 255, 255, 0.9)",
        age: 0,
        life: 0.32
      });
    }

    update(deltaTime) {
      const alive = [];
      for (const p of this.particles) {
        p.age += deltaTime;
        if (p.age >= p.life) {
          continue;
        }
        if (p.kind === "dot") {
          p.vy += p.gravity * deltaTime;
          p.x += p.vx * deltaTime;
          p.y += p.vy * deltaTime;
        } else if (p.kind === "ring") {
          p.radius = 10 + (p.maxRadius - 10) * (p.age / p.life);
        }
        alive.push(p);
      }
      this.particles = alive;
    }

    render(ctx) {
      for (const p of this.particles) {
        const t = p.age / p.life;
        if (p.kind === "dot") {
          ctx.globalAlpha = 1 - t;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (1 - t * 0.5), 0, Math.PI * 2);
          ctx.fill();
        } else if (p.kind === "ring") {
          ctx.globalAlpha = (1 - t) * 0.9;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 4 * (1 - t) + 1;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }
  };
})();
