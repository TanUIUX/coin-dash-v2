# assets/sounds

Thư mục này hiện để trống — game vẫn có đầy đủ âm thanh.

Coin Dash dùng Web Audio API để tạo hiệu ứng beep và nhạc nền đơn giản
(xem `js/audio.js`), nên không cần file âm thanh nào.

## Cách thay bằng file âm thanh thật

1. Thêm file (ví dụ `jump.mp3`, `coin.mp3`, `music.mp3`) vào thư mục này.
2. Trong `js/audio.js`, tạo `new Audio("./assets/sounds/jump.mp3")` khi khởi tạo.
3. Khi phát, luôn bắt lỗi promise: `audio.play().catch(() => {})`
   để file thiếu hoặc autoplay bị chặn không làm game crash.
4. Giữ nguyên quy tắc: chỉ phát sau tương tác đầu tiên của người dùng.
