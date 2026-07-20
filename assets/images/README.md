# assets/images

Thư mục này hiện để trống — game vẫn chạy bình thường.

Coin Dash vẽ toàn bộ nhân vật, vật cản, coin và nền bằng Canvas 2D (fallback),
nên không cần file hình ảnh nào để chơi.

## Cách thay bằng sprite thật

1. Thêm file (ví dụ `player-blue.png`, `crate.png`, `coin.png`) vào thư mục này.
2. Preload hình trong `js/main.js` (tạo `Image`, đếm loaded/failed, timeout 3s).
3. Trong hàm `render()` của `js/player.js`, `js/obstacle.js`, `js/coin.js`:
   nếu ảnh đã load thành công thì dùng `ctx.drawImage(...)`,
   ngược lại giữ nguyên code vẽ fallback hiện tại.
4. Luôn dùng đường dẫn tương đối: `./assets/images/ten-file.png`.
