# assets/icons

Thư mục này hiện để trống — game vẫn chạy bình thường.

UI hiện dùng emoji và ký tự (❤, 🪙, ⏸) làm icon, kèm `aria-label` đầy đủ.

## Cách thay bằng icon thật

1. Thêm file SVG/PNG vào thư mục này (ví dụ `heart.svg`, `pause.svg`).
2. Thay nội dung nút/HUD trong `index.html` bằng thẻ `<img>`
   với đường dẫn tương đối `./assets/icons/ten-file.svg`.
3. Giữ `aria-label` trên các nút chỉ có icon để đảm bảo accessibility.
4. Có thể thêm `favicon.png` và trỏ `<link rel="icon">` trong `index.html` tới nó.
