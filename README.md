# TichPhong Share 🚀

TichPhong Share là một ứng dụng chia sẻ tệp mã nguồn mở siêu tốc, được xây dựng với **Tauri v2** và **React**. Ứng dụng hỗ trợ đa nền tảng và tích hợp sâu với hệ sinh thái **TichPhong OS**, cho phép chia sẻ file dễ dàng qua **LocalSend**, **Quick Share (Nearby Share)** và **WebDAV**.

## ✨ Tính năng nổi bật

- ⚡ **Tốc độ cao**: Truyền tệp tin thông qua mạng LAN, không giới hạn dung lượng.
- 📱 **Tương thích cao**: Hỗ trợ giao thức **LocalSend** và **Google Quick Share**, giúp chuyển tệp trực tiếp sang Android, Windows và các thiết bị khác dễ dàng.
- 🎨 **Giao diện hiện đại**: Giao diện người dùng tinh tế, hỗ trợ Dark Mode và các Theme màu đa dạng.
- 🔒 **Mã nguồn mở**: Đảm bảo sự minh bạch và an toàn dữ liệu. Không theo dõi hay thu thập dữ liệu người dùng.

## 🛠 Công nghệ sử dụng

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Framer Motion, Lucide Icons.
- **Backend/Core**: Rust, Tauri v2.
- **Giao thức**: LocalSend Protocol, Quick Share (Nearby Connections).

## 📥 Tải xuống và Cài đặt

TichPhong Share cung cấp sẵn các bộ cài đặt cho nhiều hệ điều hành khác nhau, giúp bạn cài đặt dễ dàng mà không cần phải tự biên dịch từ mã nguồn.

1. Truy cập trang **Releases** của dự án trên GitHub.
2. Tải về file cài đặt phù hợp với thiết bị của bạn:
   - **Linux**: Tải file `.deb` hoặc `.AppImage` (hỗ trợ TichPhong OS, Zorin OS, Ubuntu, Debian,...).
   - **Windows**: Tải file `.exe` (hỗ trợ Windows 10/11).
3. Chạy file đã tải về và cài đặt bình thường.

## 💻 Hướng dẫn Build từ mã nguồn (Dành cho Lập trình viên)

Nếu bạn muốn tự biên dịch hoặc đóng góp cho dự án, vui lòng làm theo các bước sau:

### Yêu cầu hệ thống
- Node.js (v18+)
- Rust & Cargo
- Các thư viện phụ thuộc của Tauri (Xem chi tiết trên trang [Tauri Prerequisites](https://tauri.app/v1/guides/getting-started/prerequisites)).

### Các bước thực hiện
1. **Clone repository**:
   ```bash
   git clone https://github.com/TichPhongOS/tichphong-share.git
   cd tichphong-share
   ```
2. **Cài đặt các gói npm**:
   ```bash
   npm install
   ```
3. **Chạy chế độ phát triển (Dev mode)**:
   ```bash
   npm run tauri dev
   ```
4. **Biên dịch bản Release**:
   ```bash
   npm run tauri build
   ```
   *Bản build hoàn chỉnh sẽ nằm trong thư mục `src-tauri/target/release/bundle/`.*

## 📄 Giấy phép & Mã nguồn mở

**TichPhong Share** được phát hành dưới Giấy phép **MIT License**.

Dự án này sử dụng và tham khảo các mã nguồn mở sau:
- **Tauri Framework** (MIT / Apache-2.0)
- **React** (MIT)
- **Tailwind CSS** (MIT)
- **Framer Motion** (MIT)
- **Lucide Icons** (ISC)
- **LocalSend Protocol** (MIT) - Dùng để khám phá và truyền tải file qua mạng cục bộ.
- **Quick Share Protocol** - Triển khai dựa trên giao thức Nearby Connections để tương thích và truyền file trực tiếp với các thiết bị Android và Windows.



---
*Built with ❤️ by the TichPhong OS Team.*
