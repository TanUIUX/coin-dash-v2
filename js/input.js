/* Coin Dash — input.js
   InputManager: bàn phím + Pointer Events. Không xử lý trực tiếp gameplay,
   chỉ phát sự kiện cho Game qua callback. */
(function () {
  "use strict";
  window.CoinDash = window.CoinDash || {};

  window.CoinDash.InputManager = class InputManager {
    constructor() {
      this.heldCodes = new Set();
      this.callbacks = {
        jump: null,
        pauseToggle: null,
        confirm: null,
        anyInteraction: null
      };
      this.isGameplayActive = function () { return false; };
      this.attached = false;
    }

    on(name, callback) {
      this.callbacks[name] = callback;
    }

    setGameplayCheck(fn) {
      this.isGameplayActive = fn;
    }

    attach(canvas) {
      if (this.attached) {
        return;
      }
      this.attached = true;
      const self = this;

      document.addEventListener("keydown", function (event) {
        self.handleKeyDown(event);
      });
      document.addEventListener("keyup", function (event) {
        self.heldCodes.delete(event.code);
      });

      /* Dùng Pointer Events: phủ cả chuột lẫn cảm ứng, không cần touchstart/mousedown riêng.
         Chỉ gắn vào canvas nên chạm vào nút UI không kích hoạt nhảy. */
      if (canvas) {
        canvas.addEventListener("pointerdown", function (event) {
          event.preventDefault();
          self.fire("anyInteraction");
          self.fire("jump");
        });
      }

      window.addEventListener("blur", function () {
        self.reset();
      });
    }

    handleKeyDown(event) {
      const code = event.code;
      this.fire("anyInteraction");

      if (code === "Space" || code === "ArrowUp" || code === "KeyW") {
        /* Chỉ preventDefault khi phím đang được dùng cho gameplay. */
        if (this.isGameplayActive()) {
          if (code === "Space" || code === "ArrowUp") {
            event.preventDefault();
          }
          /* Giữ phím không được tạo nhảy liên tục. */
          if (event.repeat || this.heldCodes.has(code)) {
            return;
          }
          this.heldCodes.add(code);
          this.fire("jump");
        }
        return;
      }

      if (code === "KeyP" || code === "Escape") {
        this.fire("pauseToggle");
        return;
      }

      if (code === "Enter") {
        this.fire("confirm");
      }
    }

    fire(name) {
      const callback = this.callbacks[name];
      if (typeof callback === "function") {
        callback();
      }
    }

    /* Reset input đang giữ (gọi khi đổi trạng thái). */
    reset() {
      this.heldCodes.clear();
    }
  };
})();
