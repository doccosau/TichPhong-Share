# Changelog

Tất cả các thay đổi nổi bật của TichPhong Share sẽ được ghi lại trong tệp này. Định dạng dựa trên [Keep a Changelog](https://keepachangelog.com/).

## [2.0.1] - 2026-06-07

### ✨ Tính năng mới & Cải tiến
- **Thông báo cập nhật thông minh**: Ứng dụng tự động chạy ngầm kiểm tra phiên bản mới từ GitHub Release và gửi thông báo hệ thống (Notification) nếu có bản cập nhật mới.
- **Tự động nhận diện nền tảng**: Cửa sổ cập nhật tự động đưa ra link tải phù hợp với hệ điều hành đang sử dụng (Windows `.exe`/`.msi` hoặc Linux `.deb`/`.rpm`).
- **Nâng cấp giao diện QR Connect**: Thêm hiển thị địa chỉ liên kết trực tiếp ở chế độ phát Hotspot, giúp người dùng dễ dàng copy và chia sẻ link mà không cần quét mã QR.

### 🔧 Khắc phục lỗi & Tối ưu (Bug Fixes)
- Khắc phục các sự cố tương thích và tối ưu hóa kết nối đối với giao thức **LocalSend**.
- Loại bỏ hoàn toàn cơ chế `tauri-plugin-updater` giúp tối ưu dung lượng, tăng độ ổn định và loại bỏ quá trình xác thực chữ ký số rườm rà.

## [2.0.0] - 2026-06-06

### ✨ Tính năng mới (New Features)
- **QR Connect**: Giới thiệu phương thức chia sẻ hoàn toàn mới. Thiết bị di động chỉ cần quét mã QR trên PC là có thể truy cập ngay vào WebApp để gửi file không cần cài đặt ứng dụng.
- **TichPhong Direct Protocol**: Cải tiến giao thức truyền tải cục bộ mang lại tốc độ siêu tốc, tối đa hóa giới hạn phần cứng mạng LAN.
- **Windows Context Menu**: Tích hợp tính năng "Send to TichPhong Share" vào menu chuột phải (Explorer) trên hệ điều hành Windows.
- **System Tray (Khay hệ thống)**: Ứng dụng hỗ trợ thu nhỏ xuống khay hệ thống, chạy nền ổn định trên cả Linux và Windows.
- **Cross-platform Packages**: Hỗ trợ xuất file cài đặt chuẩn `.deb` (Debian/Ubuntu) và `.rpm` (Fedora/RHEL).

### 💄 Giao diện & Trải nghiệm (UI/UX)
- **Thiết kế Light Jade**: Tối ưu màu sắc hiển thị cho chế độ Light Theme, đồng bộ hệ sinh thái TichPhong OS.
- **WebApp Dashboard**: Giao diện nhận file trên điện thoại được làm mới với khả năng hiển thị biểu đồ và **tốc độ truyền tải theo thời gian thực**.
- **Kéo thả thông minh (Drag-and-drop)**: Trải nghiệm kéo thả mượt mà hơn khi gửi cùng lúc nhiều file hoặc thư mục.
- **Thumbnail Previews**: Hỗ trợ hiển thị ảnh thu nhỏ cho các tập tin media trước khi gửi.

### 🛡️ Bảo mật & Hệ thống (Security & Under the hood)
- **Upload 2 bước (2-Step Verification)**: Các file gửi từ điện thoại vào PC phải được xác nhận trên màn hình máy tính trước khi lưu, chống việc bị spam file rác qua LAN.
- **Smart Port Fallback**: Hệ thống tự động nhảy port (scan cổng trống kế tiếp) nếu port 8080 hoặc 8081 đang bị ứng dụng khác chiếm dụng.
- **Smart User-Agent Check**: Nâng cấp phòng thủ API backend khỏi các lượt truy cập không hợp lệ trên mạng nội bộ.
- **Windows Metadata**: Cấu hình đầy đủ thông tin định danh (Publisher, Copyright) cho binary để chuẩn bị Reputation với Windows SmartScreen.

### 🔧 Khắc phục lỗi (Bug Fixes)
- Sửa lỗi tương thích file khi nhận từ các thiết bị Android sử dụng chuẩn Quick Share.
- Khắc phục sự cố tương phản màu sắc thanh tiến trình khi chạy trên hệ điều hành Windows ở chế độ sáng.
