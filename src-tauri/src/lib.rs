/*
 * Copyright (c) 2024 TichPhong OS / doccosau
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

mod qrc;

use axum::{
    body::Body,
    extract::{Query, State as AxumState},
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use directories::UserDirs;
use futures_util::StreamExt;
use local_ip_address::local_ip;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs::{self, File};
use std::io::Write;
use std::net::{Ipv4Addr, SocketAddr, SocketAddrV4};
use std::path::PathBuf;
use std::process::Command as StdCommand;
use std::sync::Arc;
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    AppHandle, Emitter, Manager,
};
use tauri_plugin_autostart::ManagerExt;

use tauri_plugin_opener::OpenerExt;
use tokio::io::AsyncReadExt;
use tokio::net::UdpSocket;

use dav_server::{fakels::FakeLs, localfs::LocalFs, warp::dav_handler, DavHandler};
use rqs_lib::channel::{ChannelAction, ChannelDirection, ChannelMessage};
use rqs_lib::{Visibility, RQS};
use tokio::sync::{oneshot, Mutex as AsyncMutex};
use tower_http::cors::CorsLayer;
use warp::Filter;

#[derive(Clone, Serialize, Deserialize, Debug)]
struct Device {
    id: String,
    name: String,
    device_type: String,
    ip: String,
    port: u16,
}

fn default_port() -> u16 {
    53317
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[allow(non_snake_case)]
struct LocalSendDto {
    alias: String,
    version: String,
    #[serde(default)]
    deviceModel: Option<String>,
    #[serde(default)]
    deviceType: String,
    fingerprint: String,
    #[serde(default = "default_port")]
    port: u16,
    #[serde(default)]
    protocol: String,
    #[serde(default)]
    download: bool,
    #[serde(default)]
    announcement: Option<bool>,
}

#[derive(Deserialize, Serialize, Clone, Debug)]
#[allow(non_snake_case)]
struct FileRequestInfo {
    id: String,
    fileName: String,
    size: u64,
    fileType: String,
}

#[derive(Deserialize, Debug)]
struct PrepareUploadPayload {
    info: LocalSendDto,
    files: HashMap<String, FileRequestInfo>,
}

#[derive(Serialize)]
#[allow(non_snake_case)]
struct PrepareUploadResponse {
    sessionId: String,
    files: HashMap<String, String>, // fileId -> token
}

#[derive(Deserialize)]
#[allow(non_snake_case)]
#[allow(dead_code)]
struct UploadQuery {
    sessionId: String,
    fileId: String,
    token: String,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct TransferHistoryItem {
    pub name: String,
    pub device: String,
    pub time: String,
    pub direction: String, // "inbound" | "outbound"
}

fn default_theme() -> String {
    "light".to_string()
}
fn default_accent() -> String {
    "jade".to_string()
}
fn default_language() -> String {
    "vi".to_string()
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct ShareSettings {
    pub alias: String,
    pub fingerprint: String,
    pub download_dir: String,
    #[serde(default = "default_theme")]
    pub theme: String,
    #[serde(default = "default_accent")]
    pub accent: String,
    #[serde(default = "default_language")]
    pub language: String,
    pub auto_accept: Option<bool>,
    #[serde(default)]
    pub history: Vec<TransferHistoryItem>,
}

impl ShareSettings {
    fn load() -> Self {
        let default_dir = UserDirs::new()
            .and_then(|u| {
                u.download_dir()
                    .map(|d| d.join("TichPhongShare").to_string_lossy().into_owned())
            })
            .unwrap_or_else(|| "/tmp/TichPhongShare".to_string());

        let default_settings = ShareSettings {
            alias: "TichPhong OS".to_string(),
            fingerprint: uuid::Uuid::new_v4().to_string(),
            download_dir: default_dir,
            theme: "light".to_string(),
            accent: "jade".to_string(),
            language: "vi".to_string(),
            auto_accept: Some(false),
            history: vec![],
        };

        if let Some(config_dir) =
            UserDirs::new().and_then(|u| Some(u.home_dir().join(".config").join("tichphong-share")))
        {
            let _ = fs::create_dir_all(&config_dir);
            let config_file = config_dir.join("settings.json");

            if let Ok(data) = fs::read_to_string(&config_file) {
                if let Ok(settings) = serde_json::from_str(&data) {
                    return settings;
                }
            } else {
                let _ = fs::write(
                    config_file,
                    serde_json::to_string_pretty(&default_settings).unwrap(),
                );
            }
        }

        default_settings
    }

    fn save(&self) {
        if let Some(config_dir) =
            UserDirs::new().and_then(|u| Some(u.home_dir().join(".config").join("tichphong-share")))
        {
            let _ = fs::create_dir_all(&config_dir);
            let config_file = config_dir.join("settings.json");
            let _ = fs::write(config_file, serde_json::to_string_pretty(self).unwrap());
        }
    }
}

struct ShareState {
    app_handle: AppHandle,
    pending_receives: AsyncMutex<HashMap<String, oneshot::Sender<bool>>>,
    active_sessions: AsyncMutex<HashMap<String, (String, HashMap<String, FileRequestInfo>)>>,
    settings: std::sync::Mutex<ShareSettings>,
    active_send_cancel: std::sync::Mutex<Option<Arc<std::sync::atomic::AtomicBool>>>,
    active_receive_cancel: std::sync::Mutex<Option<Arc<std::sync::atomic::AtomicBool>>>,
    rqs_sender: tokio::sync::broadcast::Sender<ChannelMessage>,
    rqs_send_channel: AsyncMutex<Option<tokio::sync::mpsc::Sender<rqs_lib::SendInfo>>>,
    webdav_cancel: AsyncMutex<Option<tokio::sync::oneshot::Sender<()>>>,
    qrc_state: AsyncMutex<Option<Arc<qrc::QrcState>>>,
}

#[tauri::command]
fn open_received_file(
    file_name: String,
    state: tauri::State<'_, Arc<ShareState>>,
) -> Result<(), String> {
    let dir = { state.settings.lock().unwrap().download_dir.clone() };
    let path = std::path::PathBuf::from(dir).join(file_name);
    if let Some(path_str) = path.to_str() {
        if let Err(e) = state.app_handle.opener().open_path(path_str, None::<&str>) {
            return Err(e.to_string());
        }
    }
    Ok(())
}

#[tauri::command]
fn cancel_send(state: tauri::State<'_, Arc<ShareState>>) {
    if let Some(flag) = state.active_send_cancel.lock().unwrap().as_ref() {
        flag.store(true, std::sync::atomic::Ordering::SeqCst);
    }
}

#[tauri::command]
fn cancel_receive(state: tauri::State<'_, Arc<ShareState>>) {
    if let Some(flag) = state.active_receive_cancel.lock().unwrap().as_ref() {
        flag.store(true, std::sync::atomic::Ordering::SeqCst);
    }
}

#[tauri::command]
fn open_received_folder(state: tauri::State<'_, Arc<ShareState>>) -> Result<(), String> {
    let dir = { state.settings.lock().unwrap().download_dir.clone() };
    if let Err(e) = state.app_handle.opener().open_path(dir, None::<&str>) {
        return Err(e.to_string());
    }
    Ok(())
}

#[tauri::command]
fn open_ftp(mut ftp_url: String) -> Result<(), String> {
    if !ftp_url.starts_with("ftp://")
        && !ftp_url.starts_with("smb://")
        && !ftp_url.starts_with("http")
    {
        ftp_url = format!("ftp://{}", ftp_url);
    }

    #[cfg(target_os = "windows")]
    {
        StdCommand::new("explorer")
            .arg(&ftp_url)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        if let Err(e) = StdCommand::new("nautilus").arg(&ftp_url).spawn() {
            return Err(format!("Không thể mở Nautilus: {}", e));
        }
    }
    #[cfg(target_os = "macos")]
    {
        StdCommand::new("open")
            .arg(&ftp_url)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
async fn start_webdav(state: tauri::State<'_, Arc<ShareState>>) -> Result<String, String> {
    let mut cancel_guard = state.webdav_cancel.lock().await;
    if cancel_guard.is_some() {
        return Ok("Đang chạy".to_string());
    }

    let dir = { state.settings.lock().unwrap().download_dir.clone() };
    let local_fs = LocalFs::new(dir, false, false, false);
    let handler = DavHandler::builder()
        .filesystem(local_fs)
        .locksystem(FakeLs::new())
        .build_handler();
    let webdav = dav_handler(handler);
    let routes = warp::any().and(webdav);

    let (tx, rx) = tokio::sync::oneshot::channel::<()>();

    let (_, server) =
        warp::serve(routes).bind_with_graceful_shutdown(([0, 0, 0, 0], 8080), async {
            rx.await.ok();
        });

    tokio::spawn(server);
    *cancel_guard = Some(tx);

    Ok("Đã bật WebDAV tại cổng 8080".to_string())
}

#[tauri::command]
async fn stop_webdav(state: tauri::State<'_, Arc<ShareState>>) -> Result<(), String> {
    let mut cancel_guard = state.webdav_cancel.lock().await;
    if let Some(tx) = cancel_guard.take() {
        let _ = tx.send(());
    }
    Ok(())
}

#[tauri::command]
fn get_settings(state: tauri::State<'_, Arc<ShareState>>) -> ShareSettings {
    state.settings.lock().unwrap().clone()
}

#[tauri::command]
fn update_settings(
    new_settings: ShareSettings,
    state: tauri::State<'_, Arc<ShareState>>,
) -> Result<(), String> {
    let mut settings = state.settings.lock().unwrap();
    *settings = new_settings.clone();
    settings.save();

    if let Some(window) = state.app_handle.get_webview_window("main") {
        let theme = if new_settings.theme == "dark" {
            tauri::Theme::Dark
        } else {
            tauri::Theme::Light
        };
        let _ = window.set_theme(Some(theme));
    }

    Ok(())
}

#[tauri::command]
fn get_local_ip() -> String {
    local_ip()
        .map(|ip| ip.to_string())
        .unwrap_or_else(|_| "127.0.0.1".to_string())
}

#[tauri::command]
async fn accept_receive(
    session_id: String,
    tauri_state: tauri::State<'_, Arc<ShareState>>,
) -> Result<(), String> {
    let mut pending = tauri_state.pending_receives.lock().await;
    if let Some(tx) = pending.remove(&session_id) {
        let _ = tx.send(true);
        Ok(())
    } else {
        Err("Session not found".into())
    }
}

#[tauri::command]
async fn reject_receive(
    session_id: String,
    tauri_state: tauri::State<'_, Arc<ShareState>>,
) -> Result<(), String> {
    let mut pending = tauri_state.pending_receives.lock().await;
    if let Some(tx) = pending.remove(&session_id) {
        let _ = tx.send(false);
        Ok(())
    } else {
        Err("Session not found".into())
    }
}

#[tauri::command]
async fn send_file(
    ip: String,
    file_paths: Vec<String>,
    state: tauri::State<'_, Arc<ShareState>>,
) -> Result<String, String> {
    let target_url = format!("https://{}:53317/api/localsend/v2/prepare-upload", ip);
    let client = reqwest::Client::builder()
        .danger_accept_invalid_certs(true)
        .build()
        .map_err(|e| e.to_string())?;

    let mut files_map = serde_json::Map::new();
    let mut file_info_list = Vec::new();

    let mut total_size_all_files: u64 = 0;

    for (i, file_path) in file_paths.iter().enumerate() {
        let file_name = std::path::Path::new(file_path)
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .into_owned();

        let file_size = std::fs::metadata(file_path).map(|m| m.len()).unwrap_or(0);
        total_size_all_files += file_size;

        let file_id = format!("file-{}", i);

        files_map.insert(
            file_id.clone(),
            serde_json::json!({
                "id": file_id,
                "fileName": file_name,
                "size": file_size,
                "fileType": "application/octet-stream",
            }),
        );

        file_info_list.push((file_id, file_path.clone(), file_size));
    }

    let prepare_req = serde_json::json!({
        "info": {
            "alias": "TichPhong OS",
            "version": "2.0",
            "deviceModel": "Desktop",
            "deviceType": "desktop",
            "fingerprint": "tichphong-share-client",
            "port": 53317,
            "protocol": "http"
        },
        "files": files_map
    });

    let res = client
        .post(&target_url)
        .json(&prepare_req)
        .send()
        .await
        .map_err(|e| format!("Không thể kết nối đến thiết bị: {}", e))?;

    if !res.status().is_success() {
        if res.status() == 403 {
            return Err("Thiết bị từ chối nhận file".to_string());
        }
        return Err(format!("Lỗi từ thiết bị: {}", res.status()));
    }

    let _ = state.app_handle.emit(
        "send-progress",
        serde_json::json!({
            "status": "waiting",
            "progress": 0,
            "sent": 0,
            "total": 0
        }),
    );

    let res_json: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
    let session_id = res_json["sessionId"].as_str().unwrap_or("");

    let accepted_files = res_json["files"]
        .as_object()
        .ok_or("No files in response")?;

    let sent_all_files = std::sync::Arc::new(std::sync::atomic::AtomicU64::new(0));

    for (file_id, file_path, _file_size_actual) in file_info_list {
        if let Some(file_token_val) = accepted_files.get(&file_id) {
            let file_token = file_token_val.as_str().unwrap_or("");

            let upload_url = format!(
                "https://{}:53317/api/localsend/v2/upload?sessionId={}&fileId={}&token={}",
                ip, session_id, file_id, file_token
            );

            let file = tokio::fs::File::open(&file_path)
                .await
                .map_err(|e| e.to_string())?;

            let app_handle = state.app_handle.clone();
            let sent_all_files_clone = sent_all_files.clone();

            let cancel_flag = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));
            *state.active_send_cancel.lock().unwrap() = Some(cancel_flag.clone());

            let stream = futures_util::stream::unfold(
                (file, app_handle, sent_all_files_clone, cancel_flag),
                move |(mut file, app_handle, sent_all_files_clone, cancel_flag)| async move {
                    if cancel_flag.load(std::sync::atomic::Ordering::SeqCst) {
                        return Some((
                            Err::<Vec<u8>, std::io::Error>(std::io::Error::new(
                                std::io::ErrorKind::Interrupted,
                                "Đã hủy gửi",
                            )),
                            (file, app_handle, sent_all_files_clone, cancel_flag),
                        ));
                    }

                    let mut buf = vec![0u8; 1024 * 1024]; // 1MB chunks
                    match file.read(&mut buf).await {
                        Ok(0) => None,
                        Ok(n) => {
                            let current_sent = sent_all_files_clone
                                .fetch_add(n as u64, std::sync::atomic::Ordering::SeqCst)
                                + n as u64;
                            let progress = if total_size_all_files > 0 {
                                (current_sent as f64 / total_size_all_files as f64) * 100.0
                            } else {
                                100.0
                            };

                            let _ = app_handle.emit(
                                "send-progress",
                                serde_json::json!({
                                    "status": "sending",
                                    "progress": progress,
                                    "sent": current_sent,
                                    "total": total_size_all_files
                                }),
                            );

                            Some((
                                Ok::<_, std::io::Error>(buf[..n].to_vec()),
                                (file, app_handle, sent_all_files_clone, cancel_flag),
                            ))
                        }
                        Err(e) => Some((
                            Err::<Vec<u8>, std::io::Error>(e),
                            (file, app_handle, sent_all_files_clone, cancel_flag),
                        )),
                    }
                },
            );

            let body = reqwest::Body::wrap_stream(stream);

            let upload_res = client
                .post(&upload_url)
                .body(body)
                .send()
                .await
                .map_err(|e| format!("Lỗi khi gửi file {}: {}", file_id, e))?;

            if !upload_res.status().is_success() {
                return Err("Gửi file thất bại".to_string());
            }
        }
    }

    Ok("Đã gửi thành công!".to_string())
}

fn get_my_info(state: &ShareState) -> LocalSendDto {
    let settings = state.settings.lock().unwrap();
    LocalSendDto {
        alias: settings.alias.clone(),
        version: "2.0".to_string(),
        deviceModel: Some("TichPhong OS".to_string()),
        deviceType: "desktop".to_string(),
        fingerprint: settings.fingerprint.clone(),
        port: 53317,
        protocol: "http".to_string(),
        download: true,
        announcement: Some(true),
    }
}

// --- LocalSend HTTP Handlers ---

async fn info_handler(AxumState(state): AxumState<Arc<ShareState>>) -> Json<LocalSendDto> {
    let mut info = get_my_info(&state);
    info.announcement = None; // Not needed in HTTP info
    Json(info)
}

async fn register_handler(
    axum::extract::ConnectInfo(addr): axum::extract::ConnectInfo<SocketAddr>,
    AxumState(state): AxumState<Arc<ShareState>>,
    Json(info): Json<LocalSendDto>,
) -> Json<LocalSendDto> {
    // Other device discovered us via HTTP
    let _ = state.app_handle.emit(
        "device-found",
        Device {
            id: info.fingerprint.clone(),
            name: info.alias.clone(),
            device_type: info.deviceType.clone(),
            ip: addr.ip().to_string(),
            port: 53317,
        },
    );

    let mut my_info = get_my_info(&state);
    my_info.announcement = None;
    Json(my_info)
}

async fn prepare_upload_handler(
    AxumState(state): AxumState<Arc<ShareState>>,
    Json(payload): Json<PrepareUploadPayload>,
) -> Result<Json<PrepareUploadResponse>, StatusCode> {
    let session_id = uuid::Uuid::new_v4().to_string();

    let (tx, rx) = oneshot::channel();
    state
        .pending_receives
        .lock()
        .await
        .insert(session_id.clone(), tx);

    let _ = state.app_handle.emit(
        "receive-request",
        serde_json::json!({
            "sessionId": session_id,
            "sender": payload.info.alias,
            "files": payload.files
        }),
    );

    if let Ok(accepted) = rx.await {
        if accepted {
            let mut files_resp = HashMap::new();
            for (file_id, _) in &payload.files {
                files_resp.insert(file_id.clone(), uuid::Uuid::new_v4().to_string());
            }

            // Store session info for upload handler
            state.active_sessions.lock().await.insert(
                session_id.clone(),
                (payload.info.alias.clone(), payload.files),
            );

            return Ok(Json(PrepareUploadResponse {
                sessionId: session_id,
                files: files_resp,
            }));
        }
    }

    Err(StatusCode::FORBIDDEN)
}

async fn upload_handler(
    AxumState(state): AxumState<Arc<ShareState>>,
    Query(query): Query<UploadQuery>,
    body: Body,
) -> StatusCode {
    let active = state.active_sessions.lock().await;
    let (sender_name, session_files) = match active.get(&query.sessionId) {
        Some(s) => s,
        None => return StatusCode::FORBIDDEN,
    };

    let file_info = match session_files.get(&query.fileId) {
        Some(fi) => fi.clone(),
        None => return StatusCode::BAD_REQUEST,
    };
    let sender_name_clone = sender_name.clone();
    drop(active);

    let share_dir = {
        let settings = state.settings.lock().unwrap();
        PathBuf::from(&settings.download_dir)
    };
    let _ = fs::create_dir_all(&share_dir);
    let file_path = share_dir.join(&file_info.fileName);

    if let Ok(mut file) = File::create(&file_path) {
        let mut stream = body.into_data_stream();
        let mut received: u64 = 0;
        let total = file_info.size;

        let cancel_flag = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));
        *state.active_receive_cancel.lock().unwrap() = Some(cancel_flag.clone());

        while let Some(chunk) = stream.next().await {
            if cancel_flag.load(std::sync::atomic::Ordering::SeqCst) {
                let _ = std::fs::remove_file(&file_path);
                return StatusCode::BAD_REQUEST;
            }
            if let Ok(data) = chunk {
                let _ = file.write_all(&data);
                received += data.len() as u64;
                let progress = if total > 0 {
                    (received as f64 / total as f64) * 100.0
                } else {
                    100.0
                };
                let _ = state.app_handle.emit(
                    "receive-progress",
                    serde_json::json!({
                        "fileName": file_info.fileName,
                        "progress": progress,
                        "received": received,
                        "total": total
                    }),
                );
            }
        }
        let _ = state.app_handle.emit(
            "file-received",
            serde_json::json!({
                "name": file_info.fileName,
                "device": sender_name_clone,
                "time": chrono::Local::now().format("%H:%M:%S").to_string()
            }),
        );
        StatusCode::OK
    } else {
        StatusCode::INTERNAL_SERVER_ERROR
    }
}

async fn cancel_handler() -> StatusCode {
    StatusCode::OK
}

#[tauri::command]
fn get_cli_args() -> Vec<String> {
    std::env::args().skip(1).collect()
}

#[tauri::command]
async fn send_quickshare(
    id: String,
    name: String,
    ip: String,
    port: u16,
    file_paths: Vec<String>,
    state: tauri::State<'_, Arc<ShareState>>,
) -> Result<(), String> {
    let send_channel_opt = state.rqs_send_channel.lock().await;
    if let Some(send_channel) = &*send_channel_opt {
        let send_info = rqs_lib::SendInfo {
            id,
            name,
            addr: format!("{}:{}", ip, port),
            ob: rqs_lib::OutboundPayload::Files(file_paths),
        };
        send_channel
            .send(send_info)
            .await
            .map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("Quick Share is not initialized".to_string())
    }
}

#[tauri::command]
fn accept_quickshare(id: String, state: tauri::State<'_, Arc<ShareState>>) {
    let msg = ChannelMessage {
        id,
        direction: ChannelDirection::FrontToLib,
        action: Some(ChannelAction::AcceptTransfer),
        rtype: None,
        state: None,
        meta: None,
    };
    let _ = state.rqs_sender.send(msg);
}

#[tauri::command]
fn reject_quickshare(id: String, state: tauri::State<'_, Arc<ShareState>>) {
    let msg = ChannelMessage {
        id,
        direction: ChannelDirection::FrontToLib,
        action: Some(ChannelAction::RejectTransfer),
        rtype: None,
        state: None,
        meta: None,
    };
    let _ = state.rqs_sender.send(msg);
}

// --- QR Connect Tauri Commands ---

#[derive(Serialize)]
struct QrcStartResponse {
    url: String,
    wifi_qr: Option<String>,
}

#[tauri::command]
async fn start_qr_connect(
    mode: String,
    state: tauri::State<'_, Arc<ShareState>>,
) -> Result<QrcStartResponse, String> {
    // Stop existing QRC session if any
    let mut qrc_guard = state.qrc_state.lock().await;
    if let Some(ref existing) = *qrc_guard {
        qrc::stop(existing).await;
    }

    let (download_dir, alias, theme, accent) = {
        let s = state.settings.lock().unwrap();
        (
            s.download_dir.clone(),
            s.alias.clone(),
            s.theme.clone(),
            s.accent.clone(),
        )
    };
    let (url, _token, qrc_state, wifi_qr) = qrc::start(
        state.app_handle.clone(),
        download_dir,
        mode,
        alias,
        theme,
        accent,
    )
    .await?;
    *qrc_guard = Some(qrc_state);
    Ok(QrcStartResponse { url, wifi_qr })
}

#[tauri::command]
async fn stop_qr_connect(state: tauri::State<'_, Arc<ShareState>>) -> Result<(), String> {
    let mut qrc_guard = state.qrc_state.lock().await;
    if let Some(ref existing) = *qrc_guard {
        qrc::stop(existing).await;
    }
    *qrc_guard = None;
    Ok(())
}

#[tauri::command]
async fn qrc_share_files(
    file_paths: Vec<String>,
    state: tauri::State<'_, Arc<ShareState>>,
) -> Result<(), String> {
    let qrc_guard = state.qrc_state.lock().await;
    match &*qrc_guard {
        Some(qrc_state) => {
            qrc::share_files(qrc_state, file_paths).await;
            Ok(())
        }
        None => Err("QR Connect is not active".into()),
    }
}

#[tauri::command]
async fn qrc_accept_upload(
    upload_id: String,
    state: tauri::State<'_, Arc<ShareState>>,
) -> Result<(), String> {
    let qrc_guard = state.qrc_state.lock().await;
    match &*qrc_guard {
        Some(qrc_state) => qrc::accept_upload(qrc_state, upload_id).await,
        None => Err("QR Connect is not active".into()),
    }
}

#[tauri::command]
async fn qrc_reject_upload(
    upload_id: String,
    state: tauri::State<'_, Arc<ShareState>>,
) -> Result<(), String> {
    let qrc_guard = state.qrc_state.lock().await;
    match &*qrc_guard {
        Some(qrc_state) => qrc::reject_upload(qrc_state, upload_id).await,
        None => Err("QR Connect is not active".into()),
    }
}

#[tauri::command]
async fn qrc_update_theme(
    theme: String,
    accent: String,
    state: tauri::State<'_, Arc<ShareState>>,
) -> Result<(), String> {
    let qrc_guard = state.qrc_state.lock().await;
    if let Some(qrc_state) = &*qrc_guard {
        qrc::qrc_update_theme(qrc_state, theme, accent).await;
    }
    Ok(())
}

// --- Startup ---

async fn start_http_server(state: Arc<ShareState>) {
    let app = Router::new()
        .route("/api/localsend/v2/info", get(info_handler))
        .route("/api/localsend/v1/info", get(info_handler))
        .route("/api/localsend/v2/register", post(register_handler))
        .route(
            "/api/localsend/v2/prepare-upload",
            post(prepare_upload_handler),
        )
        .route("/api/localsend/v2/upload", post(upload_handler))
        .route("/api/localsend/v2/cancel", post(cancel_handler))
        .with_state(state)
        .layer(CorsLayer::permissive());

    let addr = SocketAddr::from(([0, 0, 0, 0], 53317));
    if let Ok(listener) = tokio::net::TcpListener::bind(addr).await {
        println!("LocalSend HTTP API running on http://{}", addr);
        let _ = axum::serve(
            listener,
            app.into_make_service_with_connect_info::<SocketAddr>(),
        )
        .await;
    }
}

fn start_udp_discovery(state: Arc<ShareState>) {
    tauri::async_runtime::spawn(async move {
        let multicast_addr: Ipv4Addr = "224.0.0.167".parse().unwrap();
        let port: u16 = 53317;

        let listen_addr = SocketAddrV4::new(Ipv4Addr::UNSPECIFIED, port);
        let socket = match UdpSocket::bind(listen_addr).await {
            Ok(s) => s,
            Err(e) => {
                println!("Failed to bind UDP socket: {}", e);
                return;
            }
        };
        let _ = socket.join_multicast_v4(multicast_addr, Ipv4Addr::UNSPECIFIED);
        let _ = socket.set_broadcast(true);

        let socket = Arc::new(socket);
        let socket_for_broadcast = socket.clone();
        let state_for_broadcast = state.clone();

        let broadcast_addr = SocketAddr::from((multicast_addr, port));
        let broadcast_fallback = SocketAddr::from(([255, 255, 255, 255], port));

        // Broadcast loop
        tauri::async_runtime::spawn(async move {
            loop {
                let announce_msg = get_my_info(&state_for_broadcast);
                if let Ok(msg_bytes) = serde_json::to_string(&announce_msg) {
                    let _ = socket_for_broadcast
                        .send_to(msg_bytes.as_bytes(), broadcast_addr)
                        .await;
                    let _ = socket_for_broadcast
                        .send_to(msg_bytes.as_bytes(), broadcast_fallback)
                        .await;
                }
                tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
            }
        });

        let mut buf = [0u8; 2048];
        loop {
            if let Ok((len, src)) = socket.recv_from(&mut buf).await {
                let msg_str = String::from_utf8_lossy(&buf[..len]);
                match serde_json::from_slice::<LocalSendDto>(&buf[..len]) {
                    Ok(info) => {
                        let my_fingerprint = state.settings.lock().unwrap().fingerprint.clone();
                        if info.fingerprint == my_fingerprint {
                            continue;
                        }
                        let device = Device {
                            id: info.fingerprint.clone(),
                            name: info.alias.clone(),
                            device_type: info.deviceType.clone(),
                            ip: src.ip().to_string(),
                            port: 53317,
                        };

                        let _ = state.app_handle.emit("device-found", device);

                        if info.announcement.unwrap_or(false) {
                            let mut reply_msg = get_my_info(&state);
                            reply_msg.announcement = Some(false);
                            if let Ok(reply_bytes) = serde_json::to_string(&reply_msg) {
                                let _ = socket.send_to(reply_bytes.as_bytes(), src).await;
                            }
                        }
                    }
                    Err(e) => {
                        println!(
                            "Failed to parse UDP from {}: {} - Payload: {}",
                            src, e, msg_str
                        );
                    }
                }
            }
        }
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::Builder::new().build())
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
            if args.len() > 1 {
                let paths: Vec<String> = args.iter().skip(1).cloned().collect();
                let _ = app.emit("open-files", paths);
            }
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            let quit_i = MenuItem::with_id(app, "quit", "Thoát hoàn toàn", true, None::<&str>)?;
            let show_i = MenuItem::with_id(app, "show", "Mở TichPhong Share", true, None::<&str>)?;
            let send_i = MenuItem::with_id(app, "send", "Gửi File", true, None::<&str>)?;
            let receive_i = MenuItem::with_id(app, "receive", "Nhận File", true, None::<&str>)?;
            let qrc_i = MenuItem::with_id(app, "qrconnect", "QR Connect", true, None::<&str>)?;
            let portal_i = MenuItem::with_id(app, "portal", "Device Portal", true, None::<&str>)?;
            let settings_i = MenuItem::with_id(app, "settings", "Cài đặt", true, None::<&str>)?;
            let separator = tauri::menu::PredefinedMenuItem::separator(app)?;

            let menu = Menu::with_items(
                app,
                &[
                    &show_i,
                    &separator,
                    &send_i,
                    &receive_i,
                    &qrc_i,
                    &portal_i,
                    &settings_i,
                    &separator,
                    &quit_i,
                ],
            )?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(true)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        std::process::exit(0);
                    }
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    id @ "send"
                    | id @ "receive"
                    | id @ "portal"
                    | id @ "settings"
                    | id @ "qrconnect" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                            let _ = window.emit("navigate_tab", id);
                        }
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        button_state: tauri::tray::MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            let _ = app.autolaunch().enable();

            let (rqs_tx, _rqs_rx) = tokio::sync::broadcast::channel(50);

            let app_handle = app.handle().clone();
            let settings = ShareSettings::load();
            if let Some(window) = app_handle.get_webview_window("main") {
                let theme = if settings.theme == "dark" {
                    tauri::Theme::Dark
                } else {
                    tauri::Theme::Light
                };
                let _ = window.set_theme(Some(theme));
            }

            let share_state = Arc::new(ShareState {
                app_handle: app.handle().clone(),
                pending_receives: AsyncMutex::new(HashMap::new()),
                active_sessions: AsyncMutex::new(HashMap::new()),
                settings: std::sync::Mutex::new(settings),
                active_send_cancel: std::sync::Mutex::new(None),
                active_receive_cancel: std::sync::Mutex::new(None),
                rqs_sender: rqs_tx.clone(),
                rqs_send_channel: AsyncMutex::new(None),
                webdav_cancel: AsyncMutex::new(None),
                qrc_state: AsyncMutex::new(None),
            });

            app.manage(share_state.clone());

            let state_clone = share_state.clone();
            let app_handle_clone = app_handle.clone();

            tauri::async_runtime::spawn(async move {
                let user_dirs = UserDirs::new().unwrap();
                let dl_dir = user_dirs
                    .download_dir()
                    .unwrap_or(&user_dirs.home_dir())
                    .join("TichPhongShare");
                std::fs::create_dir_all(&dl_dir).unwrap_or_default();

                let mut rqs = RQS::new(Visibility::Visible, Some(53318), Some(dl_dir));
                // override message sender
                rqs.message_sender = rqs_tx;

                let (send_channel, _ble_receiver) = rqs.run().await.unwrap();
                let discovery_channel = tokio::sync::broadcast::channel(10);
                let mut discovery_rx = discovery_channel.0.subscribe();
                let _ = rqs.discovery(discovery_channel.0);

                *state_clone.rqs_send_channel.lock().await = Some(send_channel);

                let app_handle_clone2 = app_handle_clone.clone();
                tauri::async_runtime::spawn(async move {
                    while let Ok(info) = discovery_rx.recv().await {
                        if info.present.unwrap_or(false) {
                            let device = Device {
                                id: info.id.clone(),
                                name: info
                                    .name
                                    .unwrap_or_else(|| "Quick Share Device".to_string()),
                                device_type: "QuickShare".to_string(),
                                ip: info.ip.unwrap_or_default(),
                                port: info
                                    .port
                                    .unwrap_or_else(|| "0".to_string())
                                    .parse()
                                    .unwrap_or(0),
                            };
                            let _ = app_handle_clone2.emit("device-found", device);
                        }
                    }
                });

                // FORCE mDNS REGISTRATION (Bug fix for rquickshare)
                tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
                rqs.change_visibility(Visibility::Invisible);
                tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
                rqs.change_visibility(Visibility::Visible);

                let mut message_receiver = rqs.message_sender.subscribe();
                while let Ok(msg) = message_receiver.recv().await {
                    if msg.direction == ChannelDirection::LibToFront {
                        let _ = app_handle_clone.emit("quickshare-event", msg);
                    }
                }
            });

            let state_clone_2 = share_state.clone();
            tauri::async_runtime::spawn(async move {
                start_http_server(state_clone_2).await;
            });

            start_udp_discovery(share_state.clone());

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_local_ip,
            send_file,
            cancel_send,
            cancel_receive,
            accept_receive,
            reject_receive,
            get_settings,
            update_settings,
            open_received_file,
            open_received_folder,
            open_ftp,
            start_webdav,
            stop_webdav,
            get_cli_args,
            accept_quickshare,
            reject_quickshare,
            send_quickshare,
            start_qr_connect,
            stop_qr_connect,
            qrc_share_files,
            qrc_accept_upload,
            qrc_reject_upload,
            qrc_update_theme
        ])
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                let _ = window.hide();
                api.prevent_close();
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
