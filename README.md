# TichPhong Share 🚀

*[🇻🇳 Xem phiên bản Tiếng Việt bên dưới (Scroll down for Vietnamese)]*

TichPhong Share is an ultra-fast, open-source file sharing application built with **Tauri v2** and **React**. The app is cross-platform and deeply integrated into the **TichPhong OS** ecosystem, allowing seamless file sharing via **LocalSend**, **Quick Share (Nearby Connections)**, and **WebDAV**.

## ✨ Key Features

- ⚡ **High Speed**: Transfer files over LAN with no file size limits.
- 📱 **High Compatibility**: Supports **LocalSend** and **Google Quick Share** protocols, making it easy to transfer files directly to Android, Windows, and other devices.
- 🎨 **Modern UI**: A sleek, refined user interface with Dark Mode and diverse color themes.
- 🔒 **Open Source**: Ensures transparency and data safety. We do not track or collect user data.

## 🛠 Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Framer Motion, Lucide Icons.
- **Backend/Core**: Rust, Tauri v2.
- **Protocols**: LocalSend Protocol, Quick Share (Nearby Connections).

## 📥 Download & Installation

TichPhong Share provides pre-built installers for multiple operating systems, allowing for easy installation without the need to compile from source.

1. Go to the project's **Releases** page on GitHub.
2. Download the installer that matches your device:
   - **Linux**: Download `.deb` or `.AppImage` files (supports TichPhong OS, Zorin OS, Ubuntu, Debian, etc.).
   - **Windows**: Download the `.exe` file (supports Windows 10/11).
3. Run the downloaded file and install normally.

## 💻 Build from Source (For Developers)

If you wish to compile the project yourself or contribute, please follow these steps:

### Prerequisites
- Node.js (v18+)
- Rust & Cargo
- Tauri's system dependencies (See [Tauri Prerequisites](https://tauri.app/v1/guides/getting-started/prerequisites)).

### Steps
1. **Clone the repository**:
   ```bash
   git clone https://github.com/doccosau/TichPhong-Share.git
   cd TichPhong-Share
   ```
2. **Install npm packages**:
   ```bash
   npm install
   ```
3. **Run in development mode**:
   ```bash
   npm run tauri dev
   ```
4. **Compile a release build**:
   ```bash
   npm run tauri build
   ```
   *The complete build will be located in `src-tauri/target/release/bundle/`.*

## 📄 License & Open Source

**TichPhong Share** is released under the **MIT License**.

This project uses and references the following open-source resources:
- **Tauri Framework** (MIT / Apache-2.0)
- **React** (MIT)
- **Tailwind CSS** (MIT)
- **Framer Motion** (MIT)
- **Lucide Icons** (ISC)
- **LocalSend Protocol** (MIT) - Used for discovering and transferring files over the local network.
- **Quick Share Protocol** - Implemented based on the Nearby Connections protocol for direct compatibility and file transfer with Android and Windows devices.

---

# 🇻🇳 Phiên bản Tiếng Việt

TichPhong Share là một ứng dụng chia sẻ tệp mã nguồn mở siêu tốc, được xây dựng với **Tauri v2** và **React**. Ứng dụng hỗ trợ đa nền tảng và tích hợp sâu với hệ sinh thái **TichPhong OS**, cho phép chia sẻ file dễ dàng qua **LocalSend**, **Quick Share (Nearby Connections)** và **WebDAV**.

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
   git clone https://github.com/doccosau/TichPhong-Share.git
   cd TichPhong-Share
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
