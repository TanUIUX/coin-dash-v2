# Coin Dash 🪙

Mini game web 2D thể loại **Endless Runner** — chạy tự động, nhảy qua vật cản,
thu thập coin, sống sót càng lâu càng tốt và mở khóa nhân vật mới.
Xây dựng hoàn toàn bằng **HTML + CSS + JavaScript thuần** (không framework,
không build tool, không backend).

## 1. Tính năng

- Nhân vật chạy tự động, nhảy đơn + nhảy kép, trọng lực, 3 máu, bất tử 1,5s sau va chạm.
- 3 loại vật cản: Low Crate, Tall Pillar, Moving Drone (bay lên xuống, chỉ từ độ khó Hard).
- Coin với 4 kiểu bố trí: đơn, hàng ngang, vòng cung, trên vật cản.
- Tốc độ tăng dần, 4 cấp độ khó theo thời gian: Easy → Normal → Hard → Extreme.
- Điểm = thời gian sống × 10 + coin × 5; lưu điểm cao + hiệu ứng “Kỷ lục mới”.
- 3 nhiệm vụ một lần có thưởng coin: Thợ săn coin, Người chạy tài năng, Bền bỉ.
- 3 nhân vật mở khóa bằng coin (chỉ khác ngoại hình, không pay-to-win).
- Đầy đủ màn hình: Loading, Home, Cách chơi, Chọn nhân vật, Cài đặt, Pause, Game Over.
- Âm thanh + nhạc nền bằng Web Audio (không cần file asset), bật/tắt được.
- Lưu dữ liệu bằng LocalStorage (điểm cao, coin, nhân vật, nhiệm vụ, cài đặt).
- Điều khiển bàn phím + cảm ứng, responsive desktop/tablet/mobile.
- Tự động Pause khi chuyển tab; rung màn hình khi trúng đòn (tắt được).

## 2. Công nghệ

- HTML5, CSS3, JavaScript thuần (ES2017, không module, không TypeScript).
- HTML5 Canvas 2D Context — toàn bộ đồ họa vẽ bằng code, không cần file ảnh.
- Web Audio API — hiệu ứng âm thanh + nhạc nền, không cần file âm thanh.
- LocalStorage — 1 key duy nhất `coinDashSave`, có migrate/validate.
- `requestAnimationFrame` — duy nhất một game loop, delta time giới hạn 33ms.
- Namespace chung `window.CoinDash`, script tải bằng `<script defer>` theo thứ tự.

## 3. Cấu trúc thư mục

```
coin-dash/
├── index.html          # Toàn bộ markup: canvas, HUD, 8 màn hình, modal
├── README.md
├── vercel.json         # Cấu hình deploy static
├── assets/
│   ├── images/README.md   # Hướng dẫn thay sprite thật
│   ├── sounds/README.md   # Hướng dẫn thay file âm thanh thật
│   └── icons/README.md
├── css/
│   ├── reset.css
│   ├── style.css       # Giao diện chính + theme
│   └── responsive.css  # Breakpoint 900/720/480px
└── js/
    ├── namespace.js    # window.CoinDash
    ├── config.js       # Mọi hằng số: world, physics, độ khó, nhân vật, nhiệm vụ
    ├── storage.js      # StorageManager (load/validate/migrate/save/reset)
    ├── audio.js        # AudioManager (Web Audio beeps + nhạc nền)
    ├── input.js        # InputManager (bàn phím + pointer)
    ├── collision.js    # intersectsAABB, circleIntersectsRectangle
    ├── player.js       # Player (physics, nhảy, render fallback)
    ├── obstacle.js     # Obstacle + ObstacleFactory (quy tắc công bằng)
    ├── coin.js         # Coin + CoinPatternFactory
    ├── missions.js     # MissionManager
    ├── ui.js           # UIManager (màn hình, HUD, toast, modal)
    ├── game.js         # Game (state machine, loop, spawn, điểm, finalize run)
    └── main.js         # Khởi tạo + wire nút + loading
```

## 4. Cách chạy

### Cách 1: Mở trực tiếp

Nhấp đúp file `index.html` — game chạy ngay trên trình duyệt, không cần cài gì.

### Cách 2: VS Code Live Server

1. Cài extension **Live Server** trong VS Code.
2. Mở thư mục `coin-dash`.
3. Chuột phải `index.html` → **Open with Live Server**.

## 5. Điều khiển

| Phím / thao tác | Hành động |
| --- | --- |
| `Space` / `↑` / `W` | Nhảy (nhấn lần 2 khi trên không = nhảy kép) |
| `P` hoặc `Esc` | Tạm dừng / Tiếp tục |
| `Enter` | Chơi lại ở màn hình Game Over |
| Chạm vào vùng chơi (mobile) | Nhảy / nhảy kép |
| Nút ⏸ góc trên phải | Tạm dừng |

## 6. Reset dữ liệu

Vào **Cài đặt → Reset dữ liệu → Xóa dữ liệu** (xác nhận 2 bước).
Hoặc thủ công: DevTools → Application → Local Storage → xóa key `coinDashSave`.

## 7. Cách thêm nhân vật mới

1. Mở `js/config.js`, thêm phần tử vào mảng `CHARACTERS`:
   ```js
   {
     id: "runner-gold",
     name: "Gold Runner",
     price: 800,
     unlockedByDefault: false,
     colors: { body: "#D9A521", trim: "#A87B12", face: "#FFFFFF" }
   }
   ```
2. Xong — thẻ nhân vật, giá, mở khóa, lưu trữ đều tự động hoạt động.
   Nhân vật chỉ khác màu sắc, không ảnh hưởng gameplay.

## 8. Cách thêm vật cản mới

1. Thêm spec vào `OBSTACLE_TYPES` trong `js/config.js` (width/height/damage…).
2. Thêm tỷ lệ xuất hiện vào `weights` của từng độ khó trong `DIFFICULTIES`.
3. Thêm nhánh vẽ trong `Obstacle.prototype.render` (`js/obstacle.js`).
4. Nếu vật cản di chuyển, xử lý thêm trong `Obstacle.update` và `ObstacleFactory.create`.
5. Cân nhắc thêm quy tắc khoảng cách vào `PAIR_MIN_GAPS` để giữ độ công bằng.

## 9. Cách thay asset

Game chạy được với thư mục `assets` trống (vẽ fallback bằng Canvas, beep bằng
Web Audio). Xem hướng dẫn chi tiết trong:

- `assets/images/README.md` — thay sprite.
- `assets/sounds/README.md` — thay âm thanh.
- `assets/icons/README.md` — thay icon UI.

Luôn dùng đường dẫn tương đối `./assets/...`.

## 10. Deploy lên Vercel

1. Tạo Git repository và push thư mục `coin-dash` lên GitHub.
2. Vào [vercel.com](https://vercel.com) → **Add New → Project** → import repository.
3. Framework Preset: chọn **Other**.
4. Build Command: để trống. Output Directory: để trống (root).
5. Nhấn **Deploy**.
6. Kiểm tra trang đã deploy — mọi asset đều dùng relative path nên chạy ngay.

File `vercel.json` đã có sẵn:

```json
{ "cleanUrls": true, "trailingSlash": false }
```

## 11. Giới hạn hiện tại

- Đồ họa là hình vẽ Canvas đơn giản, chưa có sprite sheet/animation frame thật.
- Âm thanh là beep tổng hợp, chưa có nhạc nền thu sẵn.
- Chỉ có 3 nhiệm vụ một lần, chưa có nhiệm vụ theo ngày.
- Chưa có bảng xếp hạng online / cloud save (theo phạm vi MVP).
- Lưu trữ theo từng trình duyệt/thiết bị (LocalStorage).

## 12. Định hướng phát triển

- Sprite sheet + animation frame cho nhân vật.
- Power-up (nam châm hút coin, khiên, tăng tốc).
- Nhiệm vụ hàng ngày và chuỗi đăng nhập.
- Hiệu ứng particle khi ăn coin/va chạm.
- Bảng xếp hạng online (cần backend — ngoài phạm vi MVP).
