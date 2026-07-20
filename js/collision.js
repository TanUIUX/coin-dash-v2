/* Coin Dash — collision.js
   Các hàm va chạm thuần túy, không side effect. */
(function () {
  "use strict";
  window.CoinDash = window.CoinDash || {};

  /* AABB vs AABB: a và b là { x, y, width, height }. */
  function intersectsAABB(a, b) {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  /* Hình tròn vs hình chữ nhật: circle là { x, y, radius }, rectangle là { x, y, width, height }.
     Dùng khoảng cách từ tâm coin tới điểm gần nhất trong hitbox. */
  function circleIntersectsRectangle(circle, rectangle) {
    const closestX = Math.max(rectangle.x, Math.min(circle.x, rectangle.x + rectangle.width));
    const closestY = Math.max(rectangle.y, Math.min(circle.y, rectangle.y + rectangle.height));
    const dx = circle.x - closestX;
    const dy = circle.y - closestY;
    return dx * dx + dy * dy <= circle.radius * circle.radius;
  }

  window.CoinDash.Collision = {
    intersectsAABB: intersectsAABB,
    circleIntersectsRectangle: circleIntersectsRectangle
  };
})();
