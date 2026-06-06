# TichPhong Share 🚀

*[🇻🇳 Xem phiên bản Tiếng Việt bên dưới (Scroll down for Vietnamese)]*

**TichPhong Share** is an open-source, cross-platform file sharing solution built with the goal of providing the fastest, most secure, and seamless data transfer experience within the TichPhong OS ecosystem (while also supporting Windows/Linux).

The product utilizes a hybrid architecture combining **Tauri (Rust)** for a powerful, resource-efficient Backend, and **React (TypeScript)** for a modern, user-friendly Frontend.

Below are the details of all core features and system operations.

<p align="center">
  <img src="screenshots/send_file.png" width="48%" alt="Send File" />
  <img src="screenshots/qrc_active.png" width="48%" alt="QR Connect" />
  <br/>
  <img src="screenshots/webapp_mobile.jpg" width="30%" alt="Mobile WebApp" />
</p>

## ✨ Core Features & Operations

### 1. Core Protocols: Diverse & Flexible
TichPhong Share is equipped with 3 connection methods to handle any use-case:

#### 1.1. LocalSend Protocol (Open-source Standard Compatible)
- **Features:** Fully backwards compatible with the global LocalSend app ecosystem. Enables Auto-Discovery of devices on the same LAN and high-speed file transfers via HTTPS.
- **Deep Customization:** Users have full control over:
  - Alias and recognition color.
  - Connection Port.
  - Default save directory.
  - Quick Save mode (auto-accept files without confirmation).

#### 1.2. Quick Share (Fast & Minimalist)
- **Characteristics:** Optimizes the file sending flow from PC to Mobile.
- **Mechanism:** Uses local network infrastructure but automates redundant authentication steps, providing a "Send & Go" experience. It automatically scans and retrieves the exact port of the receiving device to ensure accurate data routing.

#### 1.3. QR Connect (Technological Highlight - Embedded WebApp Server)
This exclusive feature allows mobile devices/other PCs to receive files **WITHOUT INSTALLING ANY APP**.
- **Mechanism:** The PC turns into an internal Web Server (powered by Rust's Axum framework) serving a WebApp interface directly via an encrypted HTTP path (random 12-character token).
- **Connection Modes:**
  - **LAN Mode:** Uses existing Wi-Fi/Ethernet networks.
  - **Direct Hotspot:** PC creates its own Wi-Fi Hotspot (TichPhong Share Direct) with a random password for phones to connect directly without a Router (Auto-config support for both Linux `nmcli` and Windows `netsh`).
- **Data Hub Model:** Enables group connections (multiple phones/laptops accessing a single session simultaneously).
- **Smart User-Agent Parsing:**
  - Android: Extracts detailed device models (e.g., `Android (Pixel 7)`, `Android (SM-G998B)`).
  - iOS: Neatly recognizes `Apple iPhone` / `Apple iPad`.
  - PC: Automatically attaches a 4-character identifier to prevent duplicates in team environments (e.g., `Windows PC (#A4B1)`, `Linux PC (#8F1C)`).
- **Transmission Optimization:**
  - Supports download Resume via `HTTP Range Requests`.
  - On-the-fly ZIP streaming for folders, saving PC hard drive space by eliminating temporary files.
- **Inactivity Timeout:** Sessions have no strict time limit, auto-terminating only when **no connected device interacts** for 30 minutes.
- **Smart Port Fallback:** Always prioritizes the user-selected Custom Port. If occupied, safely falls back to a random port instead of hanging the system.

### 2. User Interface & Experience (UI/UX)
- **Design System:** Employs a modern design language with an elegant, friendly "Light Jade" color palette. High-contrast colors for Progress Bars ensure clear visibility on all screens.
- **Real-time Monitoring:** Two-way WebSocket connections ensure the connected device list, transfer status, and speed are updated every millisecond without page reloads.
- **Drag & Drop:** Directly drag files and folders from the OS into the app's sharing area.
- **Data Visualization:** Displays file Thumbnails prior to sending, alongside detailed network speeds (MB/s).
- **UI Synchronization:** The QR Connect WebApp automatically inherits the Theme & Accent Color from the PC software for a seamless feel.

### 3. OS Integration
- **Windows Context Menu:** Integrates directly into the Windows Explorer right-click menu (Send to -> TichPhong Share), allowing instant file sending without opening the app first.
- **Lifecycle Management:** Can run in the background via the System Tray, ready to receive files anytime with near-zero RAM usage thanks to Rust.
- **Resilience:** Asynchronous error handling ensures the app never crashes during sudden network drops or disconnected cables.

### 4. Value Summary
TichPhong Share is not just a standard file transfer tool, but a **Personal Data Hub**. It fundamentally solves traditional barriers (app installations, logins, cables, OS limitations), turning the user's PC into a high-speed sharing server with maximum security and convenience.

## 🛠 Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Framer Motion, Lucide Icons.
- **Backend/Core**: Rust, Tauri v2, Axum (HTTP/WebSocket server).
- **Protocols**: LocalSend Protocol, Quick Share (Nearby Connections), TichPhong Direct (WebSocket + HTTP multipart).

## 📥 Download & Installation

TichPhong Share provides pre-built installers for multiple operating systems.

1. Go to the project's **[Releases](https://github.com/doccosau/TichPhong-Share/releases)** page on GitHub.
2. Download the installer for your device:
   - **Linux**: `.deb` (Ubuntu, Debian, TichPhong OS, Zorin OS, Mint) or `.rpm` (Fedora, openSUSE).
   - **Windows**: `.exe` installer (Windows 10/11).
3. Run the downloaded file and install.

## 💻 Build from Source (For Developers)

### Prerequisites
- Node.js (v18+)
- Rust & Cargo
- Tauri's system dependencies (See [Tauri Prerequisites](https://tauri.app/start/prerequisites/))

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
   *The build output is in `src-tauri/target/release/bundle/`.*

## 🏗 Architecture

```
┌──────────────────────────────────────────────────────┐
│                    Tauri v2 App                       │
│  ┌──────────────┐  ┌─────────────────────────────┐   │
│  │  React UI    │  │     Rust Backend             │   │
│  │  (App.tsx)   │◄─┤  ├── LocalSend Protocol      │   │
│  │              │  │  ├── Quick Share (rqs_lib)    │   │
│  └──────────────┘  │  ├── QR Connect (qrc.rs)     │   │
│                    │  │   ├── WebSocket Server     │   │
│                    │  │   ├── HTTP File Server      │   │
│                    │  │   └── Embedded WebApp       │   │
│                    │  └── Settings & History        │   │
│                    └─────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
         │                          │
    ┌────▼────┐              ┌──────▼──────┐
    │ Desktop │              │ Mobile Phone│
    │ Devices │              │ (Browser)   │
    │ (LAN)   │              │ QR Connect  │
    └─────────┘              └─────────────┘
```

## 📄 License & Open Source

**TichPhong Share** is released under the **MIT License**.

This project uses the following open-source components:
- **Tauri Framework** (MIT / Apache-2.0)
- **React** (MIT)
- **Tailwind CSS** (MIT)
- **Framer Motion** (MIT)
- **Lucide Icons** (ISC)
- **LocalSend Protocol** (MIT) — LAN device discovery and file transfer.
- **Quick Share / rqs_lib** (GPLv3) — Android/Windows Nearby Connections compatibility.

---

# 🇻🇳 Phiên bản Tiếng Việt

**TichPhong Share** là giải pháp chia sẻ tệp tin đa nền tảng, mã nguồn mở, được xây dựng với mục tiêu mang lại trải nghiệm truyền tải dữ liệu siêu tốc, an toàn và mượt mà nhất trong hệ sinh thái TichPhong OS (và hỗ trợ đa nền tảng Windows/Linux).

Sản phẩm sử dụng kiến trúc kết hợp giữa **Tauri (Rust)** cho Backend mạnh mẽ, tiết kiệm tài nguyên và **React (TypeScript)** cho Frontend hiện đại, thân thiện.

Dưới đây là chi tiết toàn bộ các tính năng cốt lõi và phương thức hoạt động của hệ thống.

<p align="center">
  <img src="screenshots/send_file.png" width="48%" alt="Gửi File" />
  <img src="screenshots/qrc_active.png" width="48%" alt="QR Connect" />
  <br/>
  <img src="screenshots/webapp_mobile.jpg" width="30%" alt="Giao diện WebApp" />
</p>

## ✨ Tính năng cốt lõi & Phương thức hoạt động

### 1. Giao Thức Cốt Lõi: Đa Dạng & Linh Hoạt
TichPhong Share trang bị 3 phương thức kết nối để đáp ứng mọi kịch bản sử dụng:

#### 1.1. Giao thức LocalSend (Tương thích chuẩn mã nguồn mở)
- **Tính năng:** Tương thích ngược hoàn toàn với hệ sinh thái ứng dụng LocalSend toàn cầu. Cho phép tự động tìm kiếm (Auto-Discovery) các thiết bị trong cùng mạng LAN và gửi/nhận file tốc độ cao qua giao thức HTTPS.
- **Tùy chỉnh sâu:** Người dùng có toàn quyền cấu hình:
  - Bí danh (Alias) và màu sắc nhận diện.
  - Cổng kết nối (Port).
  - Thư mục lưu trữ mặc định.
  - Chế độ tự động nhận file (Quick Save) mà không cần xác nhận.

#### 1.2. Tính năng Quick Share (Nhanh & Tối giản)
- **Đặc điểm:** Tối ưu hóa luồng gửi file từ PC sang Mobile.
- **Phương thức hoạt động:** Sử dụng cơ sở hạ tầng của mạng nội bộ nhưng tự động hóa các bước xác thực dư thừa, mang lại trải nghiệm "Gửi là tới" (Send & Go). Tính năng này tự động rà quét và lấy đúng thông tin cổng (Port) của thiết bị nhận để đảm bảo dữ liệu luôn được định tuyến chính xác.

#### 1.3. QR Connect (Điểm Nhấn Công Nghệ - WebApp Server Nhúng)
Đây là tính năng độc quyền cho phép thiết bị di động/PC khác nhận file **KHÔNG CẦN CÀI ĐẶT APP**.
- **Cơ chế:** PC tự biến thành một Web Server nội bộ (dựa trên framework Axum của Rust) phục vụ giao diện WebApp trực tiếp thông qua một đường dẫn HTTP mã hóa (Token 12 ký tự ngẫu nhiên).
- **Chế độ kết nối:**
  - **LAN Mode:** Sử dụng mạng Wi-Fi/Cáp quang hiện có.
  - **Direct Hotspot:** PC tự phát sóng Wi-Fi (TichPhong Share Direct) với mật khẩu ngẫu nhiên để điện thoại kết nối trực tiếp khi không có Router (Hỗ trợ cấu hình tự động trên cả Linux `nmcli` và Windows `netsh`).
- **Mô hình Trạm trung chuyển (Data Hub):** Cho phép kết nối nhóm (nhiều điện thoại, laptop cùng lúc truy cập vào 1 phiên).
- **Nhận diện thiết bị thông minh (Smart User-Agent Parsing):**
  - Android: Bóc tách mã máy chi tiết (VD: `Android (Pixel 7)`, `Android (SM-G998B)`).
  - iOS: Nhận diện gọn gàng `Apple iPhone` / `Apple iPad`.
  - PC: Tự động gắn mã định danh 4 ký tự để chống trùng lặp trong môi trường làm việc nhóm (VD: `Windows PC (#A4B1)`, `Linux PC (#8F1C)`).
- **Tối ưu hóa Truyền tải:**
  - Hỗ trợ tải lại (Resume) bằng `HTTP Range Requests`.
  - Nén thư mục và Tải xuống dạng luồng (On-the-fly ZIP streaming) giúp PC không bị chiếm dụng dung lượng ổ cứng để tạo file tạm.
- **Quản lý Phiên làm việc (Inactivity Timeout):** Phiên kết nối vô hạn thời gian, và chỉ tự hủy khi **không có bất kỳ thiết bị nào tương tác** trong vòng 30 phút. 
- **Cấu hình mạng thông minh:** Luôn ưu tiên dùng Cổng tùy chỉnh (Custom Port) do người dùng chọn. Nếu cổng bị chiếm dụng, tự động fallback về cổng ngẫu nhiên thay vì làm treo hệ thống.

### 2. Giao Diện & Trải Nghiệm Người Dùng (UI/UX)
- **Hệ thống thiết kế (Design System):** Sử dụng ngôn ngữ thiết kế hiện đại, bảng màu "Light Jade" thanh lịch, thân thiện. Phối màu độ tương phản cao cho các thanh tiến trình (Progress Bar), đảm bảo khả năng hiển thị rõ ràng trên mọi màn hình.
- **Theo dõi thời gian thực:** Kết nối WebSocket 2 chiều đảm bảo danh sách thiết bị kết nối, trạng thái gửi/nhận, và tốc độ truyền tải được cập nhật từng mili-giây mà không cần tải lại trang.
- **Tiện ích kéo thả (Drag & Drop):** Hỗ trợ kéo thả trực tiếp tệp tin và thư mục từ hệ điều hành vào thẳng vùng chia sẻ của ứng dụng.
- **Trực quan hóa Dữ liệu:** Hỗ trợ hiển thị ảnh thu nhỏ (Thumbnails) của các tệp tin trước khi gửi, cùng tốc độ mạng (MB/s) chi tiết.
- **Đồng bộ Giao diện:** Giao diện WebApp của QR Connect được kế thừa tự động màu sắc (Theme & Accent Color) từ phần mềm trên PC, tạo cảm giác liền mạch.

### 3. Tích Hợp Hệ Điều Hành (OS Integration)
- **Windows Context Menu:** Tích hợp trực tiếp vào Menu chuột phải của Windows Explorer (Send to -> TichPhong Share), cho phép gửi file tức thì từ trình quản lý tệp mà không cần mở app trước.
- **Quản lý Vòng đời Ứng dụng (Lifecycle):** Ứng dụng có thể chạy ngầm dưới khay hệ thống (System Tray), sẵn sàng nhận tệp bất kỳ lúc nào mà không gây tốn RAM nhờ kiến trúc Rust.
- **Khả năng tự hồi phục (Resilience):** Cơ chế quản lý lỗi bất đồng bộ đảm bảo ứng dụng không bao giờ bị Crash khi mất mạng đột ngột hay đứt cáp truyền tải.

### 4. Tổng Kết Giá Trị
TichPhong Share không chỉ là một công cụ truyền file thông thường, mà là một **Trung tâm Dữ liệu Cá nhân (Personal Data Hub)**. Nó giải quyết triệt để các rào cản truyền thống (cài app, đăng nhập, dây cáp, giới hạn hệ điều hành), biến PC của người dùng thành máy chủ chia sẻ tốc độ cao với độ bảo mật và tiện dụng tối đa.

## 🛠 Công nghệ sử dụng

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Framer Motion, Lucide Icons.
- **Backend/Core**: Rust, Tauri v2, Axum (HTTP/WebSocket server).
- **Giao thức**: LocalSend Protocol, Quick Share (Nearby Connections), TichPhong Direct (WebSocket + HTTP multipart).

## 📥 Tải xuống và Cài đặt

1. Truy cập trang **[Releases](https://github.com/doccosau/TichPhong-Share/releases)** trên GitHub.
2. Tải file cài đặt phù hợp:
   - **Linux**: `.deb` (Ubuntu, Debian, TichPhong OS, Zorin OS, Mint) hoặc `.rpm` (Fedora, openSUSE).
   - **Windows**: `.exe` (Windows 10/11).
3. Chạy file và cài đặt bình thường.

## 💻 Hướng dẫn Build (Dành cho Lập trình viên)

### Yêu cầu
- Node.js (v18+)
- Rust & Cargo
- Các thư viện phụ thuộc Tauri ([Xem chi tiết](https://tauri.app/start/prerequisites/))

### Các bước
1. **Clone repository**:
   ```bash
   git clone https://github.com/doccosau/TichPhong-Share.git
   cd TichPhong-Share
   ```
2. **Cài đặt npm packages**:
   ```bash
   npm install
   ```
3. **Chạy Dev mode**:
   ```bash
   npm run tauri dev
   ```
4. **Build Release**:
   ```bash
   npm run tauri build
   ```
   *Bản build nằm trong `src-tauri/target/release/bundle/`.*

## 📄 Giấy phép & Mã nguồn mở

**TichPhong Share** phát hành dưới Giấy phép **MIT License**.

Các mã nguồn mở được sử dụng:
- **Tauri Framework** (MIT / Apache-2.0)
- **React** (MIT)
- **Tailwind CSS** (MIT)
- **Framer Motion** (MIT)
- **Lucide Icons** (ISC)
- **LocalSend Protocol** (MIT) — Dò tìm và truyền file qua mạng cục bộ.
- **Quick Share / rqs_lib** (GPLv3) — Tương thích Nearby Connections trên Android và Windows.

---
*Built with ❤️ by the TichPhong OS Team.*
